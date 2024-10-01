import axios from "axios";
import { aws4Interceptor } from "aws4-axios";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import "dotenv/config";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { randomUUID } from "crypto";
import { UUID } from "node:crypto";

process.env.TEST_ENVIRONMENT = "dev";

const apiBaseUrl = process.env.PROXY_API_URL;
if (!apiBaseUrl) throw Error("PROXY_URL environment variable not set");
const axiosInstance = axios.create({
  validateStatus: (status: number) => {
    return status < 600;
  },
});
const interceptor = aws4Interceptor({
  options: {
    region: "eu-west-2",
    service: "execute-api",
  },
  credentials: {
    getCredentials: fromNodeProviderChain({
      timeout: 1000,
      maxRetries: 1,
      profile: process.env.AWS_PROFILE,
    }),
  },
});

axiosInstance.interceptors.request.use(interceptor);

describe("POST /token", () => {
  let clientIdAndSecret: string;

  beforeAll(async () => {
    const clientDetails = await getFirstRegisteredClient();
    clientIdAndSecret = `${clientDetails.client_id}:${clientDetails.client_secret}`;
  });

  describe("Given there is no grant_type in the request body", () => {
    it("Returns a 400 Bad Request response", async () => {
      const response = await axiosInstance.post(
        `${apiBaseUrl}/async/token`,
        "",
        {
          headers: { "x-custom-auth": "Basic " + toBase64(clientIdAndSecret) },
        },
      );

      expect(response.data).toStrictEqual({
        error: "invalid_grant",
        error_description: "Invalid grant type or grant type not specified",
      });
      expect(response.status).toBe(400);
    });
  });

  describe("Given the grant_type value is invalid", () => {
    it("Returns a 400 Bad Request response", async () => {
      const response = await axiosInstance.post(
        `${apiBaseUrl}/async/token`,
        "grant_type=invalid_grant_type",
        {
          headers: {
            "x-custom-auth": "Basic " + toBase64(clientIdAndSecret),
          },
        },
      );

      expect(response.data).toStrictEqual({
        error: "invalid_grant",
        error_description: "Invalid grant type or grant type not specified",
      });
      expect(response.status).toBe(400);
    });
  });

  describe("Given there is no Authorization header in the request", () => {
    it("Returns a 400 Bad Request response", async () => {
      const response = await axiosInstance.post(
        `${apiBaseUrl}/async/token`,
        "grant_type=client_credentials",
      );

      expect(response.data).toStrictEqual({
        error: "invalid_client",
        error_description: "Supplied client credentials not recognised",
      });
      expect(response.status).toBe(400);
    });
  });

  describe("Given the client in the Authorization header is not a registered client", () => {
    it("Returns a 400 Bad Request response", async () => {
      const invalidClientIdAndSecret = "invalidClient:invalidClientSecret";
      const response = await axiosInstance.post(
        `${apiBaseUrl}/async/token`,
        "grant_type=client_credentials",
        {
          headers: {
            "x-custom-auth": "Basic " + toBase64(invalidClientIdAndSecret),
          },
        },
      );

      expect(response.data).toStrictEqual({
        error: "invalid_client",
        error_description: "Supplied client credentials not recognised",
      });
      expect(response.status).toBe(400);
    });
  });

  describe("Given the request is valid and the client is registered", () => {
    it("Returns a 200 OK response and the access token", async () => {
      const response = await axiosInstance.post(
        `${apiBaseUrl}/async/token`,
        "grant_type=client_credentials",
        {
          headers: { "x-custom-auth": "Basic " + toBase64(clientIdAndSecret) },
        },
      );

      const accessTokenParts = response.data.access_token.split(".");
      const header = JSON.parse(fromBase64(accessTokenParts[0])) as object;
      const payload = JSON.parse(fromBase64(accessTokenParts[1])) as object;

      expect(response.data).toHaveProperty("access_token");
      expect(header).toHaveProperty("kid");
      expect(header).toHaveProperty("alg", "ES256");
      expect(header).toHaveProperty("typ", "JWT");
      expect(payload).toHaveProperty("aud");
      expect(payload).toHaveProperty("client_id");
      expect(payload).toHaveProperty("exp");
      expect(payload).toHaveProperty("iss");
      expect(payload).toHaveProperty("scope", "dcmaw.session.async_create");
      expect(response.data).toHaveProperty("expires_in", 3600);
      expect(response.data).toHaveProperty("token_type", "Bearer");
      expect(response.status).toBe(200);
    });
  });
});

describe("POST /credential", () => {
  let clientDetails: ClientDetails;
  let credentialRequestBody: CredentialRequestBody;
  let accessToken: string;

  beforeAll(async () => {
    clientDetails = await getFirstRegisteredClient();
    const clientIdAndSecret = `${clientDetails.client_id}:${clientDetails.client_secret}`;
    accessToken = await getAccessToken(clientIdAndSecret);
    credentialRequestBody = getRequestBody(clientDetails);
  });

  describe("Given there is no Authorization header in the request", () => {
    it("Returns a 401 Unauthorized response", async () => {
      const response = await axiosInstance.post(
        `${apiBaseUrl}/async/credential`,
        credentialRequestBody,
      );

      expect(response.data).toStrictEqual({
        error: "invalid_token",
        error_description: "Invalid token",
      });
      expect(response.status).toBe(401);
    });
  });

  describe("Given the Bearer token in the Authorization header is not a valid token", () => {
    it("Returns a 401 Unauthorized response", async () => {
      const response = await axiosInstance.post(
        `${apiBaseUrl}/async/credential`,
        credentialRequestBody,
        {
          headers: {
            "X-Custom-Auth": "Bearer invalid.access.token",
          },
        },
      );

      expect(response.data).toStrictEqual({
        error: "invalid_token",
        error_description: "JWT payload not valid JSON",
      });
      expect(response.status).toBe(400);
    });
  });

  describe("Given the request body is invalid", () => {
    it("Returns a 400 Bad Request response", async () => {
      const response = await axiosInstance.post(
        `${apiBaseUrl}/async/credential`,
        "invalidRequestBody",
        {
          headers: {
            "X-Custom-Auth": "Bearer " + accessToken,
          },
        },
      );

      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description: "Request body validation failed",
      });
      expect(response.status).toBe(400);
    });
  });

  describe("Given the access token signature could not be verified", () => {
    it("Returns 500 Server Error", async () => {
      const accessTokenWithInvalidSignature = makeSignatureUnverifiable(
        accessToken,
        "6T5a8kCTyXsmw_2ATkyPgtLRzsuot-_ZIXWnuXNftZP8SHHkNxwFyMaZxEnqqtQst-99AoRrUDZnPov0oztbSA",
      );

      const response = await axiosInstance.post(
        `${apiBaseUrl}/async/credential`,
        credentialRequestBody,
        {
          headers: {
            "X-Custom-Auth": "Bearer " + accessTokenWithInvalidSignature,
          },
        },
      );

      expect(response.data).toStrictEqual({
        error: "server_error",
        error_description: "Server Error",
      });
      expect(response.status).toBe(500);
    });
  });

  describe("Given the request is valid and an active session is found for a given sub", () => {
    it("Returns 200 OK", async () => {
      // Create session if it does not exist
      await axiosInstance.post(
        `${apiBaseUrl}/async/credential`,
        credentialRequestBody,
        {
          headers: {
            "X-Custom-Auth": "Bearer " + accessToken,
          },
        },
      );

      const response = await axiosInstance.post(
        `${apiBaseUrl}/async/credential`,
        credentialRequestBody,
        {
          headers: {
            "X-Custom-Auth": "Bearer " + accessToken,
          },
        },
      );

      expect(response.data).toStrictEqual({
        "https://vocab.account.gov.uk/v1/credentialStatus": "pending",
        sub: "urn:fdc:gov.uk:2022:56P4CMsGh_02YOlWpd8PAOI-2sVlB2nsNU7mcLZYhYw=",
      });
      expect(response.status).toBe(200);
    });
  });

  describe("Given the same access token is used more than once to fetch an active session", () => {
    it("Returns 200 OK", async () => {
      const response = await axiosInstance.post(
        `${apiBaseUrl}/async/credential`,
        credentialRequestBody,
        {
          headers: {
            "X-Custom-Auth": "Bearer " + accessToken,
          },
        },
      );

      expect(response.data).toStrictEqual({
        "https://vocab.account.gov.uk/v1/credentialStatus": "pending",
        sub: "urn:fdc:gov.uk:2022:56P4CMsGh_02YOlWpd8PAOI-2sVlB2nsNU7mcLZYhYw=",
      });
      expect(response.status).toBe(200);
    });
  });

  describe("Given the request is valid and a new session is created for a new sub", () => {
    it("Returns 201 Created", async () => {
      const randomSub = randomUUID();
      const credentialRequestBody = getRequestBody(clientDetails, randomSub);

      const response = await axiosInstance.post(
        `${apiBaseUrl}/async/credential`,
        credentialRequestBody,
        {
          headers: {
            "X-Custom-Auth": "Bearer " + accessToken,
          },
        },
      );

      expect(response.data).toStrictEqual({
        "https://vocab.account.gov.uk/v1/credentialStatus": "pending",
        sub: randomSub,
      });
      expect(response.status).toBe(201);
    });
  });
});

interface ClientDetails {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
}

async function getRegisteredClients(): Promise<ClientDetails[]> {
  const secretsManagerClient = new SecretsManagerClient({
    region: "eu-west-2",
  });
  const secretName = `${process.env.TEST_ENVIRONMENT}/clientRegistryApiTest`;
  const command = new GetSecretValueCommand({
    SecretId: secretName,
  });
  const response = await secretsManagerClient.send(command);
  return JSON.parse(response.SecretString!);
}

async function getFirstRegisteredClient(): Promise<ClientDetails> {
  const clientsDetails = await getRegisteredClients();
  return clientsDetails[0];
}

function toBase64(value: string): string {
  return Buffer.from(value).toString("base64");
}

function fromBase64(value: string): string {
  return Buffer.from(value, "base64").toString();
}

async function getAccessToken(clientIdAndSecret: string): Promise<string> {
  const response = await axiosInstance.post(
    `${apiBaseUrl}/async/token`,
    "grant_type=client_credentials",
    {
      headers: { "x-custom-auth": "Basic " + toBase64(clientIdAndSecret) },
    },
  );
  return response.data.access_token as string;
}

interface CredentialRequestBody {
  sub: string;
  govuk_signin_journey_id: string;
  client_id: string;
  state: string;
  redirect_uri: string;
}

function getRequestBody(
  clientDetails: ClientDetails,
  sub?: UUID | undefined,
): CredentialRequestBody {
  return <CredentialRequestBody>{
    sub:
      sub ?? "urn:fdc:gov.uk:2022:56P4CMsGh_02YOlWpd8PAOI-2sVlB2nsNU7mcLZYhYw=",
    govuk_signin_journey_id: "44444444-4444-4444-4444-444444444444",
    client_id: clientDetails.client_id,
    state: "testState",
    redirect_uri: clientDetails.redirect_uri,
  };
}

function makeSignatureUnverifiable(accessToken: string, newSignature: string) {
  accessToken = accessToken.substring(0, accessToken.lastIndexOf(".") + 1);
  return accessToken + newSignature;
}
