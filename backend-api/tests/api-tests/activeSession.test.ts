import { randomUUID } from "crypto";
import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";
import { createSessionForSub, getAccessToken } from "./utils/apiTestHelpers";

jest.setTimeout(4 * 5000);

describe("GET /async/activeSession", () => {
  describe("Given there is no Authorization header", () => {
    it("Returns an error and 401 status code", async () => {
      const response = await SESSIONS_API_INSTANCE.get("/async/activeSession");

      expect(response.status).toBe(401);
      expect(response.data).toStrictEqual({
        error: "unauthorized",
        error_description: "Invalid authorization header",
      });
    });
  });

  describe("Given the Authorization header does not start with Bearer", () => {
    it("Returns an error and 401 status code", async () => {
      const response = await SESSIONS_API_INSTANCE.get("/async/activeSession", {
        headers: { Authorization: "Basic " },
      });

      expect(response.status).toBe(401);
      expect(response.data).toStrictEqual({
        error: "unauthorized",
        error_description: "Invalid authorization header",
      });
    });
  });

  describe("Given the Bearer token from the Authorization header is missing the token", () => {
    it("Returns an error and 401 status code", async () => {
      const response = await SESSIONS_API_INSTANCE.get("/async/activeSession", {
        headers: { Authorization: "Bearer " },
      });

      expect(response.status).toBe(401);
      expect(response.data).toStrictEqual({
        error: "unauthorized",
        error_description: "Invalid authorization header",
      });
    });
  });

  describe("Given the service token JWE does not consist of 5 parts", () => {
    it("Returns an error and 400 status code", async () => {
      const response = await SESSIONS_API_INSTANCE.get("/async/activeSession", {
        headers: { Authorization: "Bearer one.two.three.four" },
      });

      expect(response.status).toBe(400);
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description: "Failed to decrypt service token",
      });
    });
  });

  describe("Given there is an error decrypting the content encryption key (CEK)", () => {
    it("Returns an error and 400 status code", async () => {
      const response = await SESSIONS_API_INSTANCE.get("/async/activeSession", {
        headers: { Authorization: "Bearer one.two.three.four.five" },
      });

      expect(response.status).toBe(400);
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description: "Failed to decrypt service token",
      });
    });
  });

  describe("Given there is an error decrypting the service token because the authentication tag is invalid", () => {
    it("Returns an error and 400 status code", async () => {
      const accessTokenWithInvalidTag = (await getAccessToken()) + "invalidTag";
      const response = await SESSIONS_API_INSTANCE.get("/async/activeSession", {
        headers: { Authorization: `Bearer ${accessTokenWithInvalidTag}` },
      });

      expect(response.status).toBe(400);
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description: "Failed to decrypt service token",
      });
    });
  });

  describe("Given service token validation fails because the scope is invalid", () => {
    it("Returns an error and 400 status code", async () => {
      const sub = randomUUID();
      const accessToken = await getAccessToken(sub, "invalid.scope");
      const response = await SESSIONS_API_INSTANCE.get("/async/activeSession", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(response.status).toBe(400);
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description: "Failed to decrypt service token",
      });
    });
  });

  describe("Given active session is not found", () => {
    it("Returns an error and 404 status code", async () => {
      const accessToken = await getAccessToken();

      const response = await SESSIONS_API_INSTANCE.get("/async/activeSession", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(response.status).toBe(404);
      expect(response.data).toStrictEqual({
        error: "session_not_found",
        error_description:
          "No active session found for the given sub identifier",
      });
    });
  });

  describe("Given the request is valid and a session is found", () => {
    it("Returns 200 status code, sessionId, redirectUri and state", async () => {
      const sub = randomUUID();
      await createSessionForSub(sub);
      const accessToken = await getAccessToken(sub);

      const response = await SESSIONS_API_INSTANCE.get("/async/activeSession", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data["sessionId"]).toBeDefined();
      expect(response.data["redirectUri"]).toBeDefined();
      expect(response.data["state"]).toBeDefined();
    });
  });
});
