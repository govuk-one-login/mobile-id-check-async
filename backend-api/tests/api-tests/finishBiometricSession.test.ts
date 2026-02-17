import { randomUUID } from "crypto";
import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";
import {
  mockBiometricSessionId,
  expectedSecurityHeaders,
  mockSessionId,
  generateRandomString,
} from "./utils/apiTestData";
import {
  createSessionForSub,
  EventResponse,
  getActiveSessionIdFromSub,
  issueBiometricToken,
  pollForEvents,
} from "./utils/apiTestHelpers";
import { AxiosResponse } from "axios";

describe("POST /async/finishBiometricSession", () => {
  describe("Given the request body is invalid", () => {
    let response: AxiosResponse;
    const mockInvalidSessionId = "invalidSessionId";
    beforeAll(async () => {
      response = await SESSIONS_API_INSTANCE.post(
        "/async/finishBiometricSession",
        {
          sessionId: mockInvalidSessionId,
          biometricSessionId: mockBiometricSessionId,
        },
      );
    });

    it("Returns 400 Bad Request response with invalid_request error", async () => {
      expect(response.status).toBe(400);
      expect(response.statusText).toBe("Bad Request");
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description: `sessionId in request body is not a valid v4 UUID. sessionId: ${mockInvalidSessionId}`,
      });
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });
  });

  describe("Given the session is in an invalid state", () => {
    let sessionId: string;
    let response: AxiosResponse;
    beforeAll(async () => {
      const sub = randomUUID();
      await createSessionForSub(sub);
      sessionId = await getActiveSessionIdFromSub(sub);

      response = await SESSIONS_API_INSTANCE.post(
        "/async/finishBiometricSession",
        {
          sessionId,
          biometricSessionId: randomUUID(),
        },
      );
    }, 20000);

    it("Returns 401 Unauthorized response with invalid_session error", () => {
      expect(response.status).toBe(401);
      expect(response.statusText).toBe("Unauthorized");
      expect(response.data).toStrictEqual({
        error: "invalid_session",
        error_description: "Session in invalid state",
      });
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });
  });

  describe("Given there is a valid request", () => {
    let sub: string;
    let govukSigninJourneyId: string;
    let sessionId: string;
    let biometricSessionId: string;
    let response: AxiosResponse;
    let eventsResponse: EventResponse[];
    beforeAll(async () => {
      sub = randomUUID();
      govukSigninJourneyId = generateRandomString();
      await createSessionForSub(sub, govukSigninJourneyId);
      sessionId = await getActiveSessionIdFromSub(sub);
      biometricSessionId = randomUUID();
      await issueBiometricToken(sessionId);

      response = await SESSIONS_API_INSTANCE.post(
        "/async/finishBiometricSession",
        {
          sessionId,
          biometricSessionId,
        },
      );

      eventsResponse = await pollForEvents({
        partitionKey: `SESSION#${sessionId}`,
        sortKeyPrefix: `TXMA#EVENT_NAME#DCMAW_ASYNC_APP_END`,
        numberOfEvents: 1,
      });
    }, 40000);

    it("Writes DCMAW_ASYNC_APP_END TxMA event", () => {
      expect(eventsResponse[0].event).toStrictEqual({
        event_name: "DCMAW_ASYNC_APP_END",
        component_id: `https://review-b-async.${process.env.TEST_ENVIRONMENT}.account.gov.uk`,
        timestamp: expect.any(Number),
        event_timestamp_ms: expect.any(Number),
        user: {
          govuk_signin_journey_id: govukSigninJourneyId,
          session_id: sessionId,
          user_id: sub,
          ip_address: expect.any(String),
          transaction_id: biometricSessionId,
        },
        extensions: {
          redirect_uri: "https://mockRedirectUri.com",
        },
        restricted: { device_information: { encoded: expect.any(String) } },
      });
    });

    it("Returns 200 OK response", () => {
      expect(response.status).toBe(200);
      expect(response.statusText).toBe("OK");
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
      expect(response.data).toEqual("");
    });
  });
});
