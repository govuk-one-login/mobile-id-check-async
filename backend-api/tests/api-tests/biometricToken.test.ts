import { expect } from "@jest/globals";
import { AxiosResponse } from "axios";
import "../../tests/testUtils/matchers";
import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";
import { expectedSecurityHeaders, mockSessionId } from "./utils/apiTestData";
import {
  EventResponse,
  getValidSessionId,
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
    let response: AxiosResponse;
    let sessionId: string;

    beforeAll(async () => {
      sessionId = "invalidSessionId";
      const requestBody = {
        sessionId,
        documentType: "NFC_PASSPORT",
      };

      response = await SESSIONS_API_INSTANCE.post(
        "/async/biometricToken",
        requestBody,
      );
    }, 5000);

    it("Returns an error and 401 status code", async () => {
      expect(response.status).toBe(401);
      expect(response.data).toStrictEqual({
        error: "invalid_session",
        error_description: "Session not found",
      });
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });

    it("Writes an event with the correct event_name", async () => {
      const eventsResponse = await pollForEvents({
        partitionKey: `SESSION#${sessionId}`,
        sortKeyPrefix: `TXMA#EVENT_NAME#DCMAW_ASYNC_CRI_4XXERROR`,
        numberOfEvents: 1,
      });

      expect(eventsResponse[0].event).toEqual(
        expect.objectContaining({
          event_name: "DCMAW_ASYNC_CRI_4XXERROR",
        }),
      );
    }, 40000);
  });

  describe("Given the session is not in a valid state", () => {
    let sessionId: string | null;
    let biometricTokenResponse: AxiosResponse;

    beforeAll(async () => {
      sessionId = await getValidSessionId();
      if (!sessionId)
        throw new Error(
          "Failed to get valid session ID to call biometricToken endpoint",
        );

      const requestBody = {
        sessionId,
        documentType: "NFC_PASSPORT",
      };

      await SESSIONS_API_INSTANCE.post("/async/biometricToken", requestBody);

      biometricTokenResponse = await SESSIONS_API_INSTANCE.post(
        "/async/biometricToken",
        requestBody,
      );
    }, 15000);

    it("Returns an error and 401 status code", () => {
      expect(biometricTokenResponse.status).toBe(401);
      expect(biometricTokenResponse.data).toStrictEqual({
        error: "invalid_session",
        error_description:
          "User session is not in a valid state for this operation.",
      });
      expect(biometricTokenResponse.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });

    it("Writes an event with the correct event_name", async () => {
      const eventsResponse = await pollForEvents({
        partitionKey: `SESSION#${sessionId}`,
        sortKeyPrefix: `TXMA#EVENT_NAME#DCMAW_ASYNC_CRI_4XXERROR`,
        numberOfEvents: 1,
      });

      expect(eventsResponse[0].event).toEqual(
        expect.objectContaining({
          event_name: "DCMAW_ASYNC_CRI_4XXERROR",
        }),
      );
    }, 40000);
  });

  describe("Given there is a valid request", () => {
    let sessionId: string | null;
    let biometricTokenResponse: AxiosResponse;

    beforeAll(async () => {
      sessionId = await getValidSessionId();
      if (!sessionId)
        throw new Error(
          "Failed to get valid session ID to call biometricToken endpoint",
        );

      const requestBody = {
        sessionId,
        documentType: "NFC_PASSPORT",
      };

      biometricTokenResponse = await SESSIONS_API_INSTANCE.post(
        "/async/biometricToken",
        requestBody,
      );
    }, 15000);

    it("Returns a 200 response with biometric access token and opaque ID", () => {
      expect(biometricTokenResponse.status).toBe(200);
      expect(biometricTokenResponse.data).toStrictEqual({
        accessToken: expect.any(String),
        opaqueId: expect.toBeValidUuid(),
      });
      expect(biometricTokenResponse.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });

    it("Writes an event with the correct event_name", async () => {
      const eventsResponse = await pollForEvents({
        partitionKey: `SESSION#${sessionId}`,
        sortKeyPrefix: `TXMA#EVENT_NAME#DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED`,
        numberOfEvents: 1,
      });

      expect(eventsResponse[0].event).toEqual(
        expect.objectContaining({
          event_name: "DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED",
        }),
      );
    }, 40000);
  });
});
