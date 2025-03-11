import { randomUUID } from "crypto";
import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";
import {
  mockBiometricSessionId,
  mockSessionId,
  expectedSecurityHeaders,
} from "./utils/apiTestData";
import { getValidSessionId } from "./utils/apiTestHelpers";

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
    beforeEach(async () => {
      sessionId = await getValidSessionId();
      if (!sessionId)
        throw new Error(
          "Failed to get valid session ID to call biometricToken endpoint",
        );
      const requestBody = {
        sessionId,
        documentType: "NFC_PASSPORT",
      };
      await SESSIONS_API_INSTANCE.post("/async/biometricToken", requestBody);
    }, 30000);

    it("Returns 200 OK response", async () => {
      const response = await SESSIONS_API_INSTANCE.post(
        "/async/finishBiometricSession",
        {
          sessionId,
          biometricSessionId: randomUUID(),
        },
      );

      expect(response.status).toBe(200);
      expect(response.statusText).toBe("OK");
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
      expect(response.data).toEqual("");
    });
  });
});
