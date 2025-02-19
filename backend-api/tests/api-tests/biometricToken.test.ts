import { expect } from "@jest/globals";
import "../../tests/testUtils/matchers";
import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";
import { expectedSecurityHeaders, mockSessionId } from "./utils/apiTestData";
import {
  getValidSessionId,
  isEventLessThanOrEqualTo60SecondsOld,
  pollForEvents,
} from "./utils/apiTestHelpers";

describe("POST /async/biometricToken", () => {
  describe("Given request body is invalid", () => {
    it("Returns an error and 400 status code", async () => {
      const requestBody = {
        sessionId: mockSessionId,
        documentType: "BUS_PASS",
      };

      const response = await SESSIONS_API_INSTANCE.post(
        "/async/biometricToken",
        requestBody,
      );

      expect(response.status).toBe(400);
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description:
          "documentType in request body is invalid. documentType: BUS_PASS",
      });
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });
  });

  describe("Given no session was found when attempting to update the session", () => {
    it("Returns an error and 401 status code", async () => {
      const requestBody = {
        sessionId: "invalidSessionId",
        documentType: "NFC_PASSPORT",
      };

      const response = await SESSIONS_API_INSTANCE.post(
        "/async/biometricToken",
        requestBody,
      );

      expect(response.status).toBe(401);
      expect(response.data).toStrictEqual({
        error: "invalid_session",
        error_description: "Session not found",
      });
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });
  });

  describe("Given there is a valid request", () => {
    let sessionId: string | null;

    beforeAll(async () => {
      sessionId = await getValidSessionId();
    }, 15000);

    it("Returns a 200 response with biometric access token and opaque ID", async () => {
      if (!sessionId)
        throw new Error(
          "Failed to get valid session ID to call biometricToken endpoint",
        );

      const requestBody = {
        sessionId,
        documentType: "NFC_PASSPORT",
      };

      const response = await SESSIONS_API_INSTANCE.post(
        "/async/biometricToken",
        requestBody,
      );

      expect(response.status).toBe(200);
      expect(response.data).toStrictEqual({
        accessToken: expect.any(String),
        opaqueId: expect.toBeValidUuid(),
      });
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    }, 5000);

    it("Writes DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED event to TxMA", async () => {
      const response = await pollForEvents({
        partitionKey: `SESSION#${sessionId}`,
        sortKeyPrefix: `TXMA#EVENT_NAME#DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED`,
        numberOfEvents: 1,
      });

      const { pk, event } = response[0];
      expect(pk).toEqual(`SESSION#${sessionId}`);
      expect(event).toEqual(
        expect.objectContaining({
          event_name: "DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED",
        }),
      );
    }, 5000);
  });
});
