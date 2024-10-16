import { SESSIONS_API_INSTANCE, STS_MOCK_API_INSTANCE } from "./utils/apiInstance";

describe("GET /async/activeSession", () => {
  let stsMockResponse
  let requestBody
  let accessToken: string

  beforeAll(async () => {
    requestBody = new URLSearchParams({
      subject_token: "testSub123",
      scope: "idCheck.activeSession.read",
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
    });
    stsMockResponse = await STS_MOCK_API_INSTANCE.post("/token", requestBody)
    accessToken = stsMockResponse.data.access_token
  })


  describe("Given service token is missing in the request header", () => {
    it("Returns an error and 401 status code", async () => {
      const response = await SESSIONS_API_INSTANCE.get("/async/activeSession");

      expect(response.status).toBe(401);
      expect(response.data).toStrictEqual({
        error: "unauthorized",
        error_description: "Invalid authorization header"
      })
    });
  });

  describe("Given there is an error decrypting the service token", () => {
    it("Returns an error and 400 status code", async () => {
      const response = await SESSIONS_API_INSTANCE.get("/async/activeSession", {
        headers: { Authorization: "Bearer one.two.three.four.five"}
      });

      expect(response.status).toBe(400);
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description: "Failed decrypting service token JWE",
      })
    });
  });

  describe("Given there is an error verifying token signature", () => {
    it("Returns an error and 400 status code", async () => {
      const response = await SESSIONS_API_INSTANCE.get("/async/activeSession", {
        headers: { Authorization: `Bearer ${accessToken}`}
      });

      expect(response.status).toBe(400);
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description: "Error verifying service token signature",
      })
    });
  });

  // describe("Given a successful call is made to /async/activeSession", () => {
  //   it("Returns 200 status code, sessionId, redirect_uri and state", async () => {
  //     const response = await SESSIONS_API_INSTANCE.get("/async/activeSession");

  //     expect(response.status).toBe(200);
  //     expect(response.data.keys.length).toBeGreaterThanOrEqual(2);
  //     expect(response.data["sessionId"]).toBeDefined()
  //     expect(response.data["redirect_uri"]).toBeDefined()
  //     expect(response.data["state"]).toBeDefined()
  //   });
  // });
});
