import { randomUUID } from "crypto";
import {
  PROXY_API_INSTANCE,
  SESSIONS_API_INSTANCE,
  STS_MOCK_API_INSTANCE,
} from "./utils/apiInstance";
import { getFirstRegisteredClient } from "./utils/getRegisteredClient";

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

async function getAccessToken(sub?: string, scope?: string) {
  const requestBody = new URLSearchParams({
    subject_token: sub ?? randomUUID(),
    scope: scope ?? "idCheck.activeSession.read",
    grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
    subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
  });
  const stsMockResponse = await STS_MOCK_API_INSTANCE.post(
    "/token",
    requestBody,
  );
  return stsMockResponse.data.access_token;
}

async function createSessionForSub(sub: string) {
  const clientDetails = await getFirstRegisteredClient();
  const clientIdAndSecret = `${clientDetails.client_id}:${clientDetails.client_secret}`;
  const clientIdAndSecretB64 =
    Buffer.from(clientIdAndSecret).toString("base64");
  const asyncTokenResponse = await PROXY_API_INSTANCE.post(
    "/async/token",
    "grant_type=client_credentials",
    {
      headers: {
        "x-custom-auth": `Basic ${clientIdAndSecretB64}`,
      },
    },
  );
  const asyncCredentialResponse = await PROXY_API_INSTANCE.post(
    "/async/credential",
    {
      sub: sub ?? randomUUID(),
      govuk_signin_journey_id: "44444444-4444-4444-4444-444444444444",
      client_id: clientDetails.client_id,
      state: "testState",
      redirect_uri: clientDetails.redirect_uri,
    },
    {
      headers: {
        "x-custom-auth": `Bearer ${asyncTokenResponse.data.access_token}`,
      },
    },
  );
  return asyncCredentialResponse.data;
}
