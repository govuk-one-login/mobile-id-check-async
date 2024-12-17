import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";

describe("POST /async/activeSession", () => {
  describe("Given there is a request", () => {
    it("Returns an error and 501 status code", async () => {
      const response = await SESSIONS_API_INSTANCE.post(
        "/async/biometricToken",
      );

      expect(response.status).toBe(501);
      expect(response.data).toStrictEqual({ error: "Not Implemented" });
    });
  });
});
