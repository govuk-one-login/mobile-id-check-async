import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";

let mockSessionId = "412b3628-8863-466b-af1b-81f747872e85";
let mockBiometricSessionId = "11111111-1111-1111-1111-111111111111";

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

    it("Returns an error and 400 status code - non valid UUID", async () => {
      mockSessionId = "random";
      const response = await SESSIONS_API_INSTANCE.post(
        "/async/finishBiometricSession",
        {
          sessionId: mockSessionId,
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
