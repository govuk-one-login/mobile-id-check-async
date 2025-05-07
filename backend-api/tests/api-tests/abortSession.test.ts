import { AxiosResponse } from "axios";
import { randomUUID } from "crypto";
import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";
import {
  expectedSecurityHeaders,
  mockClientState,
  mockInvalidUUID,
  mockSessionId,
} from "./utils/apiTestData";
import {
  createSessionForSub,
  CredentialResultResponse,
  EventResponse,
  getActiveSessionIdFromSub,
  pollForCredentialResults,
  pollForEvents,
} from "./utils/apiTestHelpers";

describe("POST /async/abortSession", () => {
  describe("Given the request body is invalid", () => {
    let response: AxiosResponse;
    beforeAll(async () => {
      response = await SESSIONS_API_INSTANCE.post("/async/abortSession", {
        sessionId: mockInvalidUUID,
      });
    });

    it("Returns 400 Bad Request response with invalid_request error", async () => {
      expect(response.status).toBe(400);
      expect(response.statusText).toBe("Bad Request");
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description: `sessionId in request body is not a valid v4 UUID. sessionId: ${mockInvalidUUID}`,
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
      response = await SESSIONS_API_INSTANCE.post("/async/abortSession", {
        sessionId: nonExistentSessionId,
      });
    });

    it("Returns 401 Unauthorized response with invalid_session error", () => {
      expect(response.status).toBe(401);
      expect(response.statusText).toBe("Unauthorized");
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
    let sub: string;
    let sessionId: string;
    let response: AxiosResponse;
    let credentialResultsResponse: CredentialResultResponse[];
    let eventsResponse: EventResponse[];

    beforeAll(async () => {
      sub = randomUUID();
      await createSessionForSub(sub);
      sessionId = await getActiveSessionIdFromSub(sub);

      response = await SESSIONS_API_INSTANCE.post("/async/abortSession", {
        sessionId,
      });

      credentialResultsResponse = await pollForCredentialResults(
        `SUB#${sub}`,
        1,
      );

      eventsResponse = await pollForEvents({
        partitionKey: `SESSION#${sessionId}`,
        sortKeyPrefix: `TXMA#EVENT_NAME#DCMAW_ASYNC_ABORT_APP`,
        numberOfEvents: 1,
      });
    }, 11000);

    it("Writes the abort session message to the IPV Core outbound queue", () => {
      expect(credentialResultsResponse[0].body).toEqual(
        expect.objectContaining({
          sub,
          state: mockClientState,
          error: "access_denied",
          error_description: "User aborted the session",
        }),
      );
    });

    it("Writes DCMAW_ASYNC_ABORT_APP event to TxMA", () => {
      expect(eventsResponse[0].event).toEqual(
        expect.objectContaining({
          event_name: "DCMAW_ASYNC_ABORT_APP",
        }),
      );
    });

    it("Returns 200 Ok response", () => {
      expect(response.status).toBe(200);
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });
  });
});
