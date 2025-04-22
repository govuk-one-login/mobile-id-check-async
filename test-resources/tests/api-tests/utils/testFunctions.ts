import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

import {
  EVENTS_API_INSTANCE,
  PROXY_API_INSTANCE,
  SESSIONS_API_INSTANCE,
  STS_MOCK_API_INSTANCE,
  TEST_RESOURCES_API_INSTANCE,
} from "./apiInstances";
import { AxiosInstance } from "axios";

interface CredentialRequestBody {
  sub: string;
  govuk_signin_journey_id: string;
  client_id: string;
  state: string;
  redirect_uri: string;
}

interface ClientDetails {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
}

export async function createSession(sub: string): Promise<void> {
  const clientDetails = await getRegisteredClientDetails();
  const clientIdAndSecret = `${clientDetails.client_id}:${clientDetails.client_secret}`;
  const accessToken = await getCredentialAccessToken(
    PROXY_API_INSTANCE,
    clientIdAndSecret,
  );
  const requestBody = getCredentialRequestBody(clientDetails, sub);
  const response = await PROXY_API_INSTANCE.post(
    `/async/credential`,
    requestBody,
    {
      headers: {
        "x-custom-auth": "Bearer " + accessToken,
      },
    },
  );
}

export async function getActiveSessionId(sub: string): Promise<string> {
  const accessToken = await getServiceToken(sub);
  const response = await SESSIONS_API_INSTANCE.get("/async/activeSession", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return response.data.sessionId;
}

async function getRegisteredClientDetails(): Promise<ClientDetails> {
  const clientsDetails = await getRegisteredClients();
  return clientsDetails[0];
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

async function getCredentialAccessToken(
  apiInstance: AxiosInstance,
  clientIdAndSecret: string,
): Promise<string> {
  const response = await apiInstance.post(
    `/async/token`,
    "grant_type=client_credentials",
    {
      headers: {
        "x-custom-auth": "Basic " + toBase64(clientIdAndSecret),
      },
    },
  );

  return response.data.access_token as string;
}

function toBase64(value: string): string {
  return Buffer.from(value).toString("base64");
}

function getCredentialRequestBody(
  clientDetails: ClientDetails,
  sub: string,
): CredentialRequestBody {
  return <CredentialRequestBody>{
    sub,
    govuk_signin_journey_id: "44444444-4444-4444-4444-444444444444",
    client_id: clientDetails.client_id,
    state: "testState",
    redirect_uri: clientDetails.redirect_uri,
  };
}

async function getServiceToken(sub: string): Promise<string> {
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
