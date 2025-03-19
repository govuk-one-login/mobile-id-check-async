import { AxiosResponse } from "axios";
import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";
import { expectedSecurityHeaders, mockSessionId } from "./utils/apiTestData";

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
  describe("Given there is a valid request", () => {
    let response: AxiosResponse;
    beforeAll(async () => {
      response = await SESSIONS_API_INSTANCE.post("/async/abortSession", {
        sessionId: mockSessionId,
      });
    }, 5000);
    it("Returns an error and 501 status code", async () => {
      expect(response.status).toBe(501);
      expect(response.data).toStrictEqual({ error: "Not Implemented" });
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });
  });
});
