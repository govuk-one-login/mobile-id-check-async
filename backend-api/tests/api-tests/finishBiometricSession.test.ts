import { AxiosResponse } from "axios";
import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";
import {
  mockBiometricSessionId,
  mockSessionId,
  expectedSecurityHeaders,
} from "./utils/apiTestData";
import {
  getValidSessionId,
  startBiometricSession,
} from "./utils/apiTestHelpers";

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

  describe("Given there is a valid request", () => {
    let sessionId: string | null;
    let response: AxiosResponse;

    beforeAll(async () => {
      sessionId = await getValidSessionId();
      if (!sessionId)
        throw new Error(
          "Failed to get valid session ID to call biometricToken endpoint",
        );
      await startBiometricSession(sessionId);

      response = await SESSIONS_API_INSTANCE.post(
        "/async/finishBiometricSession",
        {
          sessionId,
          biometricSessionId: mockBiometricSessionId,
        },
      );
    }, 20000);

    it("Returns a 501 Not Implemented response", () => {
      expect(response.status).toEqual(501);
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });
  });
});
