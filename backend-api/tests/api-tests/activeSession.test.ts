import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";

describe("GET /async/activeSession", () => {
  describe("Given service token is missing in the request header", () => {
    it("returns 401 status code with error", async () => {
      const response = await SESSIONS_API_INSTANCE.get("/async/activeSession");

      expect(response.status).toBe(401);
      expect(response.data).toStrictEqual({
        error: "unauthorized",
        error_description: "Invalid authorization header"
      })
    });
  });

  describe("Given a successful call is made", () => {
    it("returns 200 status code and the Json Web Key Set", async () => {
      const response = await SESSIONS_API_INSTANCE.get("/async/activeSession");

      expect(response.status).toBe(200);
      expect(response.data.keys.length).toBeGreaterThanOrEqual(1);
      response.data.keys.forEach((key: JsonWebKey) => {
        expect(key).toHaveProperty("sessionId");
        expect(key).toHaveProperty("redirect_uri");
        expect(key).toHaveProperty("state");
      });
    });
  });
});
