import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";

describe("POST /async/finishBiometricSession", () => {
  describe("Given there is a request", () => {
    it("Returns an error and 501 status code", async () => {
      const response = await SESSIONS_API_INSTANCE.post(
        "/async/finishBiometricSession",
      );

      expect(response.status).toBe(501);
      expect(response.data).toStrictEqual({ error: "Not Implemented" });
    });
  });
});
