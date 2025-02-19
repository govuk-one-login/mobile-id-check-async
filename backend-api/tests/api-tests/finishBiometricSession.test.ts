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

  // describe("Given the session is expired", () => {
  //   it("Returns an error and 403 status code", async () => {
  //     const requestBody = {
  //       sessionId: mockSessionId,
  //       biometricSessionId: mockBiometricSessionId,
  //     };
  //     const response = await SESSIONS_API_INSTANCE.post(
  //       "/async/finishBiometricSession",
  //       requestBody,
  //     );

  //     console.log("response", response.data);

  //     expect(response.status).toBe(403);
  //     expect(response.data).toStrictEqual({
  //       error: "expired_session",
  //       error_description: "Session has expired",
  //     });
  //     expect(response.headers).toEqual(
  //       expect.objectContaining(expectedSecurityHeaders),
  //     );
  //   });
  // });

  // describe("Given the session is in invalid state", () => {
  //   it("Returns an error and 401 status code", async () => {
  //     const response = await SESSIONS_API_INSTANCE.post(
  //       "/async/finishBiometricSession",
  //       {
  //         sessionId: mockInvalidStateSessionId,
  //         biometricSessionId: mockBiometricSessionId,
  //       },
  //     );

  //     expect(response.status).toBe(401);
  //     expect(response.data).toStrictEqual({
  //       error: "invalid_session",
  //       error_description: "Session in invalid state",
  //     });
  //     expect(response.headers).toEqual(
  //       expect.objectContaining(expectedSecurityHeaders),
  //     );
  //   });
  // });

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

  // describe("Given there is a server error", () => {
  //   it("Returns an error and 500 status code", async () => {
  //     const response = await SESSIONS_API_INSTANCE.post(
  //       "/async/finishBiometricSession",
  //       {
  //         sessionId: "server-error-session-id",
  //         biometricSessionId: mockBiometricSessionId,
  //       },
  //     );

  //     expect(response.status).toBe(500);
  //     expect(response.data).toStrictEqual({
  //       error: "server_error",
  //       error_description: "Internal Server Error",
  //     });
  //     expect(response.headers).toEqual(
  //       expect.objectContaining(expectedSecurityHeaders),
  //     );
  //   });
  // });

  // describe("Given there is a valid request", () => {
  //   it("Returns an error and 501 status code", async () => {
  //     const response = await SESSIONS_API_INSTANCE.post(
  //       "/async/finishBiometricSession",
  //       {
  //         sessionId: mockSessionId,
  //         biometricSessionId: mockBiometricSessionId,
  //       },
  //     );

  //     expect(response.status).toBe(501);
  //     expect(response.data).toStrictEqual({ error: "Not Implemented" });
  //     expect(response.headers).toEqual(
  //       expect.objectContaining(expectedSecurityHeaders),
  //     );
  //   });
  // });
});
