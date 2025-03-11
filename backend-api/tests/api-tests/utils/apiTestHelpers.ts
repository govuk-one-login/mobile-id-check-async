import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { randomUUID } from "crypto";
import {
  EVENTS_API_INSTANCE,
  PROXY_API_INSTANCE,
  SESSIONS_API_INSTANCE,
  STS_MOCK_API_INSTANCE,
} from "./apiInstance";

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

export async function getActiveSessionIdFromSub(sub: string): Promise<string> {
  const serviceToken = await getAccessToken(sub);
  const response = await SESSIONS_API_INSTANCE.get("/async/activeSession", {
    headers: { Authorization: `Bearer ${serviceToken}` },
  });

  return response.data.sessionId;
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

export const getSessionId = async (sub: string): Promise<string> => {
  const serviceToken = await getAccessToken(sub);
  const activeSessionResponse = await SESSIONS_API_INSTANCE.get(
    "/async/activeSession",
    {
      headers: { Authorization: `Bearer ${serviceToken}` },
    },
  );

  const sessionId = activeSessionResponse.data["sessionId"];
  if (!sessionId) {
    throw new Error(
      "Failed to get valid session ID to call activeSession endpoint",
    );
  }

  return sessionId;
};

export async function issueBiometricToken(sessionId: string): Promise<void> {
  const requestBody = {
    sessionId,
    documentType: "NFC_PASSPORT",
  };

  await SESSIONS_API_INSTANCE.post("/async/biometricToken", requestBody);
}

export type EventResponse = {
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

export async function pollForEvents({
  partitionKey,
  sortKeyPrefix,
  numberOfEvents,
}: {
  partitionKey: string;
  sortKeyPrefix: string;
  numberOfEvents: number;
}): Promise<EventResponse[]> {
  function currentTime() {
    return Date.now();
  }

  async function wait(delayMillis: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, delayMillis));
  }

  const INITIAL_DELAY_MILLIS = 500; // initial wait time before calling API
  const MAX_BACKOFF_MILLIS = 10000; // maximum wait time between API calls

  function calculateExponentialBackoff(attempts: number) {
    return Math.min(2 ** attempts * INITIAL_DELAY_MILLIS, MAX_BACKOFF_MILLIS);
  }

  const POLLING_DURATION_MILLIS = 40000;
  const pollEndTime = currentTime() + POLLING_DURATION_MILLIS;

  let events: unknown[] = [];
  let waitTime = 0;
  let attempts = 0;

  while (
    events.length < numberOfEvents &&
    currentTime() + waitTime < pollEndTime
  ) {
    await wait(waitTime);
    events = await getEvents({ partitionKey, sortKeyPrefix });

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
async function getEvents({
  partitionKey,
  sortKeyPrefix,
}: {
  partitionKey: string;
  sortKeyPrefix: string;
}): Promise<unknown[]> {
  const response = await EVENTS_API_INSTANCE.get("events", {
    params: {
      pkPrefix: partitionKey,
      skPrefix: sortKeyPrefix,
    },
  });

  const events = response.data;
  return Array.isArray(events) ? events : []; // If response is malformed, return empty array so polling can be retried
}
