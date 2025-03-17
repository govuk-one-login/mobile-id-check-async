import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";

describe("POST /async/abortSession", () => {
  describe("Given there is a request", () => {
    // it("Has following security headers", async () => {
    //   const response = await SESSIONS_API_INSTANCE.post("/async/abortSession");

    //   expect(response.headers).toEqual(
    //     expect.objectContaining({
    //       "Cache-Control": "no-store",
    //       "Content-Type": "application/json",
    //       "Strict-Transport-Security": "max-age=31536000",
    //       "X-Content-Type-Options": "nosniff",
    //       "X-Frame-Options": "DENY",
    //     })
    //   );
    // });

    it("Returns an error and 501 status code", async () => {
      const response = await SESSIONS_API_INSTANCE.post("/async/abortSession");

      expect(response.status).toBe(501);
      expect(response.data).toStrictEqual({ error: "Not Implemented" });
    });
  });
});
