import { AxiosResponse } from "axios";
import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";
import { expectedSecurityHeaders, mockSessionId } from "./utils/apiTestData";
import {
  createSessionForSub,
  EventResponse,
  getActiveSessionIdFromSub,
  issueBiometricToken,
  pollForEvents,
} from "./utils/apiTestHelpers";
import { randomUUID } from "crypto";

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

  describe("Given the request is valid", () => {
    let sessionId: string | null;
    let response: AxiosResponse;
    // let eventsResponse: EventResponse[];

    beforeAll(async () => {
      const sub = randomUUID();
      await createSessionForSub(sub);
      sessionId = await getActiveSessionIdFromSub(sub);
      await issueBiometricToken(sessionId);

      console.log("SESSION ID >>>>>", sessionId);

      const requestBody = {
        // sessionId: 'ec9ad1f8-124b-4a19-b209-c1b27f9466da',
        sessionId,
        eventName: "DCMAW_ASYNC_HYBRID_BILLING_STARTED",
      };
      response = await SESSIONS_API_INSTANCE.post(
        "/async/txmaEvent",
        requestBody,
      );

      await testCalls(requestBody, 5);

      // eventsResponse = await pollForEvents({
      //   partitionKey: `SESSION#${sessionId}`,
      //   sortKeyPrefix: `TXMA#EVENT_NAME#DCMAW_ASYNC_HYBRID_BILLING_STARTED`,
      //   numberOfEvents: 1,
      // });
    }, 30000);

    // it("Writes an event with the correct event_name", async () => {
    //   expect(eventsResponse[0].event).toEqual(
    //     expect.objectContaining({
    //       event_name: "DCMAW_ASYNC_HYBRID_BILLING_STARTED",
    //     }),
    //   );
    // });

    it("Returns 200 OK response", async () => {
      expect(response.status).toBe(200);
      expect(response.data).toStrictEqual("");
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    }, 25000);
  });
});

async function testCalls(requestBody: object, numberOfCalls: number = 1) {
  for (let i = 0; i < numberOfCalls; i++) {
    await SESSIONS_API_INSTANCE.post("/async/txmaEvent", requestBody);
  }
}
