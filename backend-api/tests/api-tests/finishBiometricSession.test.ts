import { randomUUID } from "crypto";
import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";
import {
  mockBiometricSessionId,
  expectedSecurityHeaders,
  mockSessionId,
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
    const invalidSessionId = "invalidSessionId";
    beforeAll(async () => {
      response = await SESSIONS_API_INSTANCE.post(
        "/async/finishBiometricSession",
        {
          sessionId: invalidSessionId,
          biometricSessionId: mockBiometricSessionId,
        },
      );
    });

    it("Returns 400 invalid request response", async () => {
      expect(response.status).toBe(400);
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description: `sessionId in request body is not a valid v4 UUID. sessionId: ${invalidSessionId}`,
      });
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });
  });

  describe("Given the session does not exist", () => {
    let response: AxiosResponse;
    const nonExistentSessionId = mockSessionId;
    beforeAll(async () => {
      response = await SESSIONS_API_INSTANCE.post(
        "/async/finishBiometricSession",
        {
          sessionId: nonExistentSessionId,
          biometricSessionId: mockBiometricSessionId,
        },
      );
    });

    it("Returns 401 invalid session response", () => {
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
    let sessionId: string;
    let response: AxiosResponse;
    let eventsResponse: EventResponse[];
    beforeAll(async () => {
      const sub = randomUUID();
      await createSessionForSub(sub);
      sessionId = await getActiveSessionIdFromSub(sub);
      await issueBiometricToken(sessionId);

      response = await SESSIONS_API_INSTANCE.post(
        "/async/finishBiometricSession",
        {
          sessionId,
          biometricSessionId: randomUUID(),
        },
      );

      eventsResponse = await pollForEvents({
        partitionKey: `SESSION#${sessionId}`,
        sortKeyPrefix: `TXMA#EVENT_NAME#DCMAW_ASYNC_APP_END`,
        numberOfEvents: 1,
      });
    }, 40000);

    it("Writes DCMAW_ASYNC_APP_END TxMA event", () => {
      expect(eventsResponse[0].event).toEqual(
        expect.objectContaining({
          event_name: "DCMAW_ASYNC_APP_END",
        }),
      );
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
