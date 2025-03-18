import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";

describe("POST /async/abortSession", () => {
  describe("Given there is a request", () => {
    it("Returns correct headers", async () => {
      const response = await SESSIONS_API_INSTANCE.post("/async/abortSession");

      expect(response.headers).toEqual(
        expect.objectContaining({
          "cache-control": "no-store",
          "content-type": "application/json",
          "strict-transport-security": "max-age=31536000",
          "x-content-type-options": "nosniff",
          "x-frame-options": "DENY",
        }),
      );
    });

    it("Returns an error and 501 status code", async () => {
      const response = await SESSIONS_API_INSTANCE.post("/async/abortSession");

      expect(response.status).toBe(501);
      expect(response.data).toStrictEqual({ error: "Not Implemented" });
    });
  });
});
