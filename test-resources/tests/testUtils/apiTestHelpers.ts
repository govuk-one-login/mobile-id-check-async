import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { aws4Interceptor } from "aws4-axios";
import axios, { AxiosInstance } from "axios";
import axiosRetry from "axios-retry";

import dotenv from "dotenv";
dotenv.config();

export const STS_MOCK_API_INSTANCE = getStsMockInstance();
export const SESSIONS_API_INSTANCE = getSessionsApiInstance();
export const PROXY_API_INSTANCE = getProxyApiInstance();
export const EVENTS_API_INSTANCE = getEventsApiInstance();
export const TEST_SESSIONS_API_INSTANCE = getTestSessionApiInstance();

console.log("STS_MOCK_API_INSTANCE", STS_MOCK_API_INSTANCE.getUri());
console.log("SESSIONS_API_INSTANCE", SESSIONS_API_INSTANCE.getUri());
console.log("PROXY_API_INSTANCE", PROXY_API_INSTANCE.getUri());
console.log("EVENTS_API_INSTANCE", EVENTS_API_INSTANCE.getUri());

function getStsMockInstance() {
  const apiUrl = process.env.STS_MOCK_API_URL;
  if (!apiUrl)
    throw new Error("STS_MOCK_API_URL needs to be defined for API tests");
  return getInstance(apiUrl);
}

function getSessionsApiInstance() {
  const apiUrl = process.env.SESSIONS_API_URL;
  if (!apiUrl)
    throw new Error("SESSIONS_API_URL needs to be defined for API tests");
  return getInstance(apiUrl);
}

function getProxyApiInstance() {
  const apiUrl = process.env.PROXY_API_URL;
  if (!apiUrl)
    throw new Error("PROXY_API_URL needs to be defined for API tests");
  return getInstance(apiUrl, true);
}

function getEventsApiInstance() {
  const apiUrl = process.env.EVENTS_API_URL;
  if (!apiUrl)
    throw new Error("EVENTS_API_URL needs to be defined for API tests");
  return getInstance(apiUrl, true);
}

function getTestSessionApiInstance() {
  const apiUrl =
    "https://test-resources-sandytr-test-resources.review-b-async.dev.account.gov.uk";
  return getInstance(apiUrl, true);
}

function getInstance(baseUrl: string, useAwsSigv4Signing: boolean = false) {
  const apiInstance = axios.create({ baseURL: baseUrl });
  axiosRetry(apiInstance, {
    retries: 2,
    retryDelay: (retryCount) => retryCount * 200,
  });
  apiInstance.defaults.validateStatus = () => true;

  if (useAwsSigv4Signing) {
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
    apiInstance.interceptors.request.use(interceptor);
  }

  return apiInstance;
}

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

  console.log("/async/credential response", {
    data: response.data,
    status: response.status,
  });
}

export async function getActiveSessionId(sub: string): Promise<string> {
  const accessToken = await getServiceToken(sub);
  const response = await SESSIONS_API_INSTANCE.get("/async/activeSession", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  console.log("/async/activeSession response", {
    data: response.data,
    status: response.status,
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

  console.log("/async/token response", {
    data: response.data,
    status: response.status,
  });

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

  console.log("sts /token response", {
    data: stsMockResponse.data,
    status: stsMockResponse.status,
  });

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
