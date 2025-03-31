import { STS_MOCK_API_INSTANCE } from "../utils/apiInstances";

describe("POST /token", () => {
  describe("Given there is no request body", () => {
    it("Returns a 400 Bad Request response", async () => {
      const requestBody = new URLSearchParams({});

      const response = await STS_MOCK_API_INSTANCE.post("/token", requestBody);

      expect(response.status).toStrictEqual(400);
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description: "Missing request body",
      });
    });
  });

  describe("Given the request body is missing 'subject_token'", () => {
    it("Returns a 400 Bad Request response", async () => {
      const requestBody = new URLSearchParams({
        scope: "idCheck.activeSession.read",
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
      });

      const response = await STS_MOCK_API_INSTANCE.post("/token", requestBody);

      expect(response.status).toStrictEqual(400);
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description: "Missing subject_token",
      });
    });
  });

  describe("Given the request body is missing 'scope'", () => {
    it("Returns a 400 Bad Request response", async () => {
      const requestBody = new URLSearchParams({
        subject_token: "testSub123",
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
      });

      const response = await STS_MOCK_API_INSTANCE.post("/token", requestBody);

      expect(response.status).toStrictEqual(400);
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description: "Missing scope",
      });
    });
  });

  describe("Given the request body is missing 'grant_type'", () => {
    it("Returns a 400 Bad Request response", async () => {
      const requestBody = new URLSearchParams({
        subject_token: "testSub123",
        scope: "idCheck.activeSession.read",
        subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
      });

      const response = await STS_MOCK_API_INSTANCE.post("/token", requestBody);

      expect(response.status).toStrictEqual(400);
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description: "Missing grant_type",
      });
    });
  });

  describe("Given the request body is missing 'subject_token_type'", () => {
    it("Returns a 400 Bad Request response", async () => {
      const requestBody = new URLSearchParams({
        subject_token: "testSub123",
        scope: "idCheck.activeSession.read",
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      });

      const response = await STS_MOCK_API_INSTANCE.post("/token", requestBody);

      expect(response.status).toStrictEqual(400);
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description: "Missing subject_token_type",
      });
    });
  });

  describe("Given the request body 'scope' has an invalid value", () => {
    it("Returns a 400 Bad Request response", async () => {
      const requestBody = new URLSearchParams({
        subject_token: "testSub123",
        scope: "invalidScope",
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
      });

      const response = await STS_MOCK_API_INSTANCE.post("/token", requestBody);

      expect(response.status).toStrictEqual(400);
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description: "Unsupported scope",
      });
    });
  });

  describe("Given the request body 'grant_type' has an invalid value", () => {
    it("Returns a 400 Bad Request response", async () => {
      const requestBody = new URLSearchParams({
        subject_token: "testSub123",
        scope: "idCheck.activeSession.read",
        grant_type: "invalidGrantType",
        subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
      });

      const response = await STS_MOCK_API_INSTANCE.post("/token", requestBody);

      expect(response.status).toStrictEqual(400);
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description: "Unsupported grant_type",
      });
    });
  });

  describe("Given the request body 'subject_token_type' has an invalid value", () => {
    it("Returns a 400 Bad Request response", async () => {
      const requestBody = new URLSearchParams({
        subject_token: "testSub123",
        scope: "idCheck.activeSession.read",
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        subject_token_type: "invalidSubjectTokenType",
      });

      const response = await STS_MOCK_API_INSTANCE.post("/token", requestBody);

      expect(response.status).toStrictEqual(400);
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description: "Unsupported subject_token_type",
      });
    });
  });

  describe("Given the request body is valid", () => {
    it("Returns 200 and the service token", async () => {
      const requestBody = new URLSearchParams({
        subject_token: "testSub123",
        scope: "idCheck.activeSession.read",
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
      });

      const response = await STS_MOCK_API_INSTANCE.post("/token", requestBody);

      expect(response.status).toStrictEqual(200);
      expect(response.data).toHaveProperty("access_token", expect.any(String));
      expect(response.data).toHaveProperty("expires_in", 180);
      expect(response.data).toHaveProperty("token_type", "Bearer");
    });
  });
});
