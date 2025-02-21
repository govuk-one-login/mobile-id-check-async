import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";
import {
  mockBiometricSessionId,
  mockSessionId,
  expectedSecurityHeaders,
} from "./utils/apiTestData";

describe("POST /async/finishBiometricSession", () => {
  describe("Given the request body is invalid", () => {
    it("Returns an error and 400 status code", async () => {
      const mockInvalidSessionId = "invalidSessionId";
      const response = await SESSIONS_API_INSTANCE.post(
        "/async/finishBiometricSession",
        {
          sessionId: mockInvalidSessionId,
          biometricSessionId: mockBiometricSessionId,
        },
      );

      expect(response.status).toBe(400);
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
    it("Returns an error and 401 status code", async () => {
      const nonExistentSessionId = mockSessionId;
      const response = await SESSIONS_API_INSTANCE.post(
        "/async/finishBiometricSession",
        {
          sessionId: nonExistentSessionId,
          biometricSessionId: mockBiometricSessionId,
        },
      );

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
});
