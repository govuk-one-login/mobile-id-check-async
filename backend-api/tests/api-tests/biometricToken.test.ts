import { expect } from "@jest/globals";
import { AxiosResponse } from "axios";
import "./utils/matchers";
import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";
import {
  expectedSecurityHeaders,
  generateRandomString,
  mockSessionId,
} from "./utils/apiTestData";
import {
  createSessionForSub,
  getActiveSessionIdFromSub,
  pollForEvents,
} from "./utils/apiTestHelpers";
import { randomUUID } from "crypto";

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
      sessionId = mockSessionId;
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
    let sessionId: string;
    let biometricTokenResponse: AxiosResponse;

    beforeAll(async () => {
      const sub = randomUUID();
      await createSessionForSub(sub);
      sessionId = await getActiveSessionIdFromSub(sub);

      const requestBody = {
        sessionId,
        documentType: "NFC_PASSPORT",
      };

      await SESSIONS_API_INSTANCE.post("/async/biometricToken", requestBody);

      biometricTokenResponse = await SESSIONS_API_INSTANCE.post(
        "/async/biometricToken",
        requestBody,
      );
    }, 25000);

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
    let sub: string;
    let sessionId: string | null;
    let govukSigninJourneyId: string;
    let biometricTokenResponse: AxiosResponse;

    beforeAll(async () => {
      sub = randomUUID();
      govukSigninJourneyId = generateRandomString();
      await createSessionForSub(sub, govukSigninJourneyId);
      sessionId = await getActiveSessionIdFromSub(sub);

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

    it("Writes DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED event to TxMA", async () => {
      const eventsResponse = await pollForEvents({
        partitionKey: `SESSION#${sessionId}`,
        sortKeyPrefix: `TXMA#EVENT_NAME#DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED`,
        numberOfEvents: 1,
      });

      expect(eventsResponse[0].event).toStrictEqual({
        event_name: "DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED",
        component_id: `https://review-b-async.${process.env.TEST_ENVIRONMENT}.account.gov.uk`,
        timestamp: expect.any(Number),
        event_timestamp_ms: expect.any(Number),
        user: {
          govuk_signin_journey_id: govukSigninJourneyId,
          session_id: sessionId,
          user_id: sub,
          ip_address: expect.any(String),
        },
        extensions: {
          redirect_uri: "https://mockRedirectUri.com",
          documentType: "NFC_PASSPORT",
          opaque_id: biometricTokenResponse.data.opaqueId,
        },
        restricted: { device_information: { encoded: expect.any(String) } },
      });
    }, 40000);
  });
});
