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

type EventResponse = {
  pk: string;
  sk: string;
  event: object;
};

function isValidEventResponse(
  eventResponse: unknown,
): eventResponse is EventResponse {
  return (
    typeof eventResponse === "object" &&
    eventResponse !== null &&
    "pk" in eventResponse &&
    typeof eventResponse.pk === "string" &&
    "sk" in eventResponse &&
    typeof eventResponse.sk === "string" &&
    "event" in eventResponse &&
    typeof eventResponse.event === "object"
  );
}

export async function pollForEvents(
  partitionKey: string,
  sortKeyPrefix: string,
  numberOfEvents: number,
): Promise<EventResponse[]> {
  async function wait(delayMillis: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, delayMillis));
  }

  function currentTime() {
    return Date.now();
  }

  function calculateExponentialBackoff(attempts: number) {
    return Math.min(2 ** attempts * INITIAL_DELAY_MILLIS, MAX_BACKOFF_MILLIS);
  }

  const POLLING_DURATION_MILLIS = 40000; // maximum time to poll API
  const MAX_BACKOFF_MILLIS = 10000; // maximum wait time between API calls
  const INITIAL_DELAY_MILLIS = 500; // initial wait time before calling API

  const pollEndTime = currentTime() + POLLING_DURATION_MILLIS;

  let events: unknown[] = [];
  let attempts = 0;
  let waitTime = 0;

  while (
    events.length < numberOfEvents &&
    currentTime() + waitTime < pollEndTime
  ) {
    await wait(waitTime);
    events = await getEvents(partitionKey, sortKeyPrefix);

    waitTime = calculateExponentialBackoff(attempts++);
  }

  if (events.length < numberOfEvents)
    throw new Error(
      `Only found ${events.length} events for pkPrefix=${partitionKey} and skPrefix=${sortKeyPrefix}. Expected to find at least ${numberOfEvents} events.`,
    );

  if (events.some((event) => !isValidEventResponse(event)))
    throw new Error("Response from /events is malformed");

  return events as EventResponse[];
}

// Call /events API
async function getEvents(
  partitionKey: string,
  sortKeyPrefix: string,
): Promise<unknown[]> {
  const response = await EVENTS_API_INSTANCE.get("events", {
    params: {
      pkPrefix: partitionKey,
      skPrefix: sortKeyPrefix,
    },
  });

  const events = response.data;
  return Array.isArray(events) ? events : []; // If response is malformed, return empty array so polling can be retried
}

export type CredentialResultResponse = {
  pk: string;
  sk: string;
  body: object;
};

function isValidCredentialResultResponse(
  credentialResultResponse: unknown,
): credentialResultResponse is CredentialResultResponse {
  return (
    typeof credentialResultResponse === "object" &&
    credentialResultResponse !== null &&
    "pk" in credentialResultResponse &&
    typeof credentialResultResponse.pk === "string" &&
    "sk" in credentialResultResponse &&
    typeof credentialResultResponse.sk === "string" &&
    "body" in credentialResultResponse &&
    typeof credentialResultResponse.body === "object"
  );
}

export async function pollForCredentialResults(
  partitionKey: string,
  numberOfResults: number,
): Promise<CredentialResultResponse[]> {
  async function wait(delayMillis: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, delayMillis));
  }

  function currentTime() {
    return Date.now();
  }

  function calculateExponentialBackoff(attempts: number) {
    return Math.min(2 ** attempts * INITIAL_DELAY_MILLIS, MAX_BACKOFF_MILLIS);
  }

  const POLLING_DURATION_MILLIS = 40000; // maximum time to poll API
  const MAX_BACKOFF_MILLIS = 10000; // maximum wait time between API calls
  const INITIAL_DELAY_MILLIS = 500; // initial wait time before calling API

  const pollEndTime = currentTime() + POLLING_DURATION_MILLIS;

  let credentialResults: unknown[] = [];
  let attempts = 0;
  let waitTime = 0;

  while (
    credentialResults.length < numberOfResults &&
    currentTime() + waitTime < pollEndTime
  ) {
    await wait(waitTime);
    credentialResults = await getCredentialResult(partitionKey);

    waitTime = calculateExponentialBackoff(attempts++);
  }

  if (credentialResults.length < numberOfResults)
    throw new Error(
      `Only found ${credentialResults.length} results for pk=${partitionKey}. Expected to find at least ${numberOfResults} result(s).`,
    );

  if (
    credentialResults.some(
      (credentialResult) => !isValidCredentialResultResponse(credentialResult),
    )
  )
    throw new Error("Response from /credentialResult is malformed");

  return credentialResults as CredentialResultResponse[];
}

// Calls /credentialResult API
async function getCredentialResult(partitionKey: string): Promise<unknown[]> {
  const response = await TEST_RESOURCES_API_INSTANCE.get("credentialResult", {
    params: {
      pk: partitionKey,
    },
  });

  const credentialResults = response.data;
  return Array.isArray(credentialResults) ? credentialResults : []; // If response is malformed, return empty array so polling can be retried
}
