import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";
import { mockBiometricSessionId, mockSessionId } from "./utils/apiTestData";

describe("POST /async/finishBiometricSession", () => {
  describe("Given there is a request", () => {
    it("Returns an error and 501 status code", async () => {
      const response = await SESSIONS_API_INSTANCE.post(
        "/async/finishBiometricSession",
        {
          sessionId: mockSessionId,
          biometricSessionId: mockBiometricSessionId,
        },
      );

      expect(response.status).toBe(501);
      expect(response.data).toStrictEqual({ error: "Not Implemented" });
    });

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
          error_description: `sessionId in request body is not a valid v4 UUID. sessionId: ${mockSessionId}`,
        });
      });
    });
  });
});
