import { randomUUID } from "crypto";
import {
  PROXY_API_INSTANCE,
  SESSIONS_API_INSTANCE,
  STS_MOCK_API_INSTANCE,
} from "./utils/apiInstance";
import { getFirstRegisteredClient } from "./utils/getRegisteredClient";

jest.setTimeout(15000);

describe("GET /async/activeSession", () => {
  beforeAll(async () => {
    // requestBody = new URLSearchParams({
    //   subject_token: randomUUID(),
    //   scope: "idCheck.activeSession.read",
    //   grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
    //   subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
    // });
    // stsMockResponse = await STS_MOCK_API_INSTANCE.post("/token", requestBody);
    // accessToken = stsMockResponse.data.access_token;
  });

  describe("Given service token is missing in the request header", () => {
    it("Returns an error and 401 status code", async () => {
      const response = await SESSIONS_API_INSTANCE.get("/async/activeSession");

      expect(response.status).toBe(401);
      expect(response.data).toStrictEqual({
        error: "unauthorized",
        error_description: "Invalid authorization header",
      });
    });
  });

  describe("Given service token is invalid", () => {
    it("Returns an error and 400 status code", async () => {
      const response = await SESSIONS_API_INSTANCE.get("/async/activeSession", {
        headers: { Authorization: "Bearer one.two.three.four.five" },
      });

      expect(response.status).toBe(400);
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description: "Failed decrypting service token JWE",
      });
    });
  });

  describe("Given active session is not found", () => {
    it("Returns an error and 404 status code", async () => {
      const accessToken = await getAccessToken(
        "478E3BF8-C3D5-4EA2-A6EE-38B07F2EE0FD",
      );

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

  describe("Given a successful call is made to /async/activeSession", () => {
    it("Returns 200 status code, sessionId, redirect_uri and state", async () => {
      const sub = randomUUID();

      // console.log("<<<<< sub >>>>>", sub)

      const asyncCredentialResponse = await createSessionForSub(sub);

      // console.log("<<<<< async credential response >>>>>", asyncCredentialResponse)

      const accessToken = await getAccessToken(sub);

      // console.log("<<<<< sts mock access token >>>>>", accessToken)

      const response = await SESSIONS_API_INSTANCE.get("/async/activeSession", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // console.log("<<<<< active session response >>>>>", response.data)

      expect(response.status).toBe(200);
      expect(response.data["sessionId"]).toBeDefined();
      expect(response.data["redirect_uri"]).toBeDefined();
      expect(response.data["state"]).toBeDefined();
    });
  });
});

async function getAccessToken(sub: string) {
  const requestBody = new URLSearchParams({
    subject_token: sub,
    scope: "idCheck.activeSession.read",
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

  // console.log("<<<<< async token basic token >>>>>", clientIdAndSecretB64)

  const asyncTokenResponse = await PROXY_API_INSTANCE.post(
    "/async/token",
    "grant_type=client_credentials",
    {
      headers: {
        "x-custom-auth": `Basic ${clientIdAndSecretB64}`,
      },
    },
  );

  // console.log("<<<<< async token response >>>>>", asyncTokenResponse.data)

  const credentialTokenResponse = await PROXY_API_INSTANCE.post(
    "/async/credential",
    {
      sub:
        sub ??
        "urn:fdc:gov.uk:2022:56P4CMsGh_02YOlWpd8PAOI-2sVlB2nsNU7mcLZYhYw=",
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
  return credentialTokenResponse.data;
}
