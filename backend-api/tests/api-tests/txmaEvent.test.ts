import { AxiosResponse } from "axios";
import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";
import { expectedSecurityHeaders, mockSessionId } from "./utils/apiTestData";
import {
  createSessionForSub,
  getActiveSessionIdFromSub,
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
      expect(response.data).toStrictEqual({
        error: "invalid_session",
        error_description: "Session does not exist or in incorrect state",
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

  describe("Given the request is valid", () => {
    let sessionId: string | null;
    let response: AxiosResponse;

    beforeAll(async () => {
      const sub = randomUUID();
      await createSessionForSub(sub);
      sessionId = await getActiveSessionIdFromSub(sub);
      const biometricTokenRequestBody = {
        sessionId,
        documentType: "NFC_PASSPORT",
      };
      await SESSIONS_API_INSTANCE.post(
        "/async/biometricToken",
        biometricTokenRequestBody,
      );
      const requestBody = {
        sessionId,
        eventName: "DCMAW_ASYNC_HYBRID_BILLING_STARTED",
      };
      response = await SESSIONS_API_INSTANCE.post(
        "/async/txmaEvent",
        requestBody,
      );
    }, 30000);

    it("Returns 501 Not Implemented response", () => {
      expect(response.status).toBe(501);
      expect(response.data).toStrictEqual({
        error: "Not Implemented",
      });
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });
  });
});
