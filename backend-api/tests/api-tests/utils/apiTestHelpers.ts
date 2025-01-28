import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import {
  PROXY_API_INSTANCE,
  SESSIONS_API_INSTANCE,
  STS_MOCK_API_INSTANCE,
} from "./apiInstance";
import { randomUUID } from "crypto";

export interface ClientDetails {
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

export async function getFirstRegisteredClient(): Promise<ClientDetails> {
  const clientsDetails = await getRegisteredClients();
  return clientsDetails[0];
}

export async function getAccessToken(sub?: string, scope?: string) {
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

export async function createSessionForSub(sub: string) {
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

export async function getValidSessionId(): Promise<string | null> {
  const sub = randomUUID();
  await createSessionForSub(sub);
  const serviceToken = await getAccessToken(sub);
  const activeSessionResponse = await SESSIONS_API_INSTANCE.get(
    "/async/activeSession",
    {
      headers: { Authorization: `Bearer ${serviceToken}` },
    },
  );
  return activeSessionResponse.data["sessionId"] ?? null;
}
