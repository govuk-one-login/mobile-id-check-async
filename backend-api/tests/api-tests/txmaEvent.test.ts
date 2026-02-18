import { AxiosResponse } from "axios";
import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";
import {
  expectedSecurityHeaders,
  generateRandomString,
  mockSessionId,
} from "./utils/apiTestData";
import {
  createSessionForSub,
  EventResponse,
  getActiveSessionIdFromSub,
  issueBiometricToken,
  pollForEvents,
} from "./utils/apiTestHelpers";
import { randomUUID } from "crypto";

const txmaBillingEventNames = [
  "DCMAW_ASYNC_HYBRID_BILLING_STARTED",
  "DCMAW_ASYNC_IPROOV_BILLING_STARTED",
  "DCMAW_ASYNC_READID_NFC_BILLING_STARTED",
];

describe("POST /async/txmaEvent", () => {
  describe("Given request body is invalid", () => {
    let response: AxiosResponse;

    beforeAll(async () => {
      const requestBody = {
        sessionId: mockSessionId,
        eventName: "INVALID_EVENT_NAME",
      };

      response = await SESSIONS_API_INSTANCE.post(
        "/async/txmaEvent",
        requestBody,
      );
    });

    it("Returns an error and 400 status code", async () => {
      expect(response.status).toBe(400);
      expect(response.statusText).toBe("Bad Request");
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description:
          "eventName in request body is invalid. eventName: INVALID_EVENT_NAME",
      });
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });
  });

  describe("Given the session is not valid", () => {
    let response: AxiosResponse;
    let sessionId: string;

    beforeAll(async () => {
      sessionId = mockSessionId;
      const requestBody = {
        sessionId,
        eventName: "DCMAW_ASYNC_HYBRID_BILLING_STARTED",
      };

      response = await SESSIONS_API_INSTANCE.post(
        "/async/txmaEvent",
        requestBody,
      );
    });

    it("Returns an error and 401 status code", async () => {
      expect(response.status).toBe(401);
      expect(response.statusText).toBe("Unauthorized");
      expect(response.data).toStrictEqual({
        error: "invalid_session",
        error_description: "Session does not exist or in incorrect state",
      });
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });
  });

  describe.each(txmaBillingEventNames)(
    "Given the request is valid - %s",
    (eventName) => {
      let sub: string;
      let sessionId: string | null;
      let govukSigninJourneyId: string;
      let response: AxiosResponse;
      let eventsResponse: EventResponse[];

      beforeAll(async () => {
        sub = randomUUID();
        govukSigninJourneyId = generateRandomString();
        await createSessionForSub(sub, govukSigninJourneyId);
        sessionId = await getActiveSessionIdFromSub(sub);
        await issueBiometricToken(sessionId);

        const requestBody = {
          sessionId,
          eventName,
        };
        response = await SESSIONS_API_INSTANCE.post(
          "/async/txmaEvent",
          requestBody,
        );

        eventsResponse = await pollForEvents({
          partitionKey: `SESSION#${sessionId}`,
          sortKeyPrefix: `TXMA#EVENT_NAME#${eventName}`,
          numberOfEvents: 1,
        });
      }, 70000);

      it(`Writes ${eventName} event to TxMA`, async () => {
        expect(eventsResponse[0].event).toStrictEqual({
          event_name: eventName,
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
          },
          restricted: { device_information: { encoded: expect.any(String) } },
        });
      });

      it("Returns 200 OK response", () => {
        expect(response.status).toBe(200);
        expect(response.data).toStrictEqual("");
        expect(response.headers).toEqual(
          expect.objectContaining(expectedSecurityHeaders),
        );
      });
    },
  );
});
