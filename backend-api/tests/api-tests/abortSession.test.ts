import { randomUUID } from "crypto";
import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";
import { expectedSecurityHeaders, mockSessionId } from "./utils/apiTestData";
import {
  createSessionForSub,
  EventResponse,
  getActiveSessionIdFromSub,
  pollForEvents,
} from "./utils/apiTestHelpers";
import { AxiosResponse } from "axios";

describe("POST /async/abortSession", () => {
  describe("Given the request body is invalid", () => {
    let response: AxiosResponse;
    const mockInvalidSessionId = "invalidSessionId";
    beforeAll(async () => {
      response = await SESSIONS_API_INSTANCE.post("/async/abortSession", {
        sessionId: mockInvalidSessionId,
      });
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
    let sessionId: string;
    let response: AxiosResponse;
    beforeAll(async () => {
      const sub = randomUUID();
      await createSessionForSub(sub);
      sessionId = await getActiveSessionIdFromSub(sub);

      response = await SESSIONS_API_INSTANCE.post("/async/abortSession", {
        sessionId,
      });

      console.log("response", response.data);
    }, 40000);

    it("Returns 501 response", () => {
      expect(response.status).toBe(501);
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
      expect(response.data).toEqual({ error: "Not Implemented" });
    });
  });
});
