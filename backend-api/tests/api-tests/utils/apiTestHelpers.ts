import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { AxiosResponse } from "axios";
import { randomUUID, UUID } from "crypto";
import {
  PROXY_API_INSTANCE,
  READ_ID_MOCK_API_INSTANCE,
  SESSIONS_API_INSTANCE,
  STS_MOCK_API_INSTANCE,
  TEST_RESOURCES_API_INSTANCE,
} from "./apiInstance";
import { mockClientState } from "./apiTestData";
import {
  createRemoteJWKSet,
  jwtVerify,
  JWTVerifyResult,
  ResolvedKey,
} from "jose";

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
      state: mockClientState,
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

export const getActiveSessionIdFromSub = async (
  sub: string,
): Promise<string> => {
  const serviceToken = await getAccessToken(sub);
  const activeSessionResponse = await SESSIONS_API_INSTANCE.get(
    "/async/activeSession",
    {
      headers: { Authorization: `Bearer ${serviceToken}` },
    },
  );

  const sessionId = activeSessionResponse.data["sessionId"];
  if (!sessionId) {
    const errorMessage = JSON.stringify({
      errorMessage:
        "Failed to get valid session ID in call to activeSession endpoint",
      sub,
      activeSessionBody: activeSessionResponse.data,
      activeSessionStatus: activeSessionResponse.status,
    });
    throw new Error(errorMessage);
  }

  return sessionId;
};

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

export const issueBiometricToken = async (
  sessionId: string,
): Promise<AxiosResponse> => {
  const requestBody = {
    sessionId,
    documentType: "NFC_PASSPORT",
  };

  return await SESSIONS_API_INSTANCE.post("/async/biometricToken", requestBody);
};

export async function setupBiometricSessionByScenario(
  biometricSessionIdDifferentNameDeleteThisLater: UUID,
  scenario: Scenario,
  opaqueId: string,
  creationDate: string,
) {
  const result = await READ_ID_MOCK_API_INSTANCE.post(
    `/setupBiometricSessionByScenario/${biometricSessionIdDifferentNameDeleteThisLater}`,
    JSON.stringify({
      scenario,
      overrides: {
        opaqueId,
        creationDate,
      },
    }),
  );
  if (result.status !== 201) {
    throw new Error(
      `Failed to setup biometric session (${result.status}): ${JSON.stringify(result.data)}`,
    );
  }
}

export async function finishBiometricSession(
  sessionId: string,
  biometricSessionId: UUID,
) {
  await SESSIONS_API_INSTANCE.post("/async/finishBiometricSession", {
    sessionId,
    biometricSessionId,
  });
}

export async function getCredentialFromIpvOutboundQueue(
  subjectIdentifier: string,
) {
  const credentialResultsResponse = await pollForCredentialResults(
    `SUB#${subjectIdentifier}`,
    1,
  );
  const credentialResult = credentialResultsResponse[0].body as Record<
    string,
    unknown
  >;
  const credentialJwtArray = credentialResult[
    "https://vocab.account.gov.uk/v1/credentialJWT"
  ] as string[];

  if (!credentialJwtArray || credentialJwtArray.length < 1) {
    throw new Error(
      `Result written to IPV Core outbound queue was not a success: ${JSON.stringify(credentialResult)}`,
    );
  }

  return credentialJwtArray[0];
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
      `Only found ${events.length} events for pkPrefix=${partitionKey} and skPrefix=${sortKeyPrefix}. Expected to find at least ${numberOfEvents} events. Please check that all expected events have been defined in the test-resources dequeue Lambda, and are being written as part of this test.`,
    );

  if (events.some((event) => !isValidEventResponse(event)))
    throw new Error("Response from /events is malformed");

  return events as EventResponse[];
}

async function getEvents({
  partitionKey,
  sortKeyPrefix,
}: {
  partitionKey: string;
  sortKeyPrefix: string;
}): Promise<unknown[]> {
  const response = await TEST_RESOURCES_API_INSTANCE.get("events", {
    params: {
      pkPrefix: partitionKey,
      skPrefix: sortKeyPrefix,
    },
  });

  const events = response.data;

  if ([404, 429, 500, 501, 502, 503].includes(response.status)) {
    return []; // These may indicate a temporary network issue; we return an empty array so polling can be retried
  }

  if (!Array.isArray(events)) {
    throw new Error("Response from /events is malformed");
  }

  return events;
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

  if ([404, 429, 500, 501, 502, 503].includes(response.status)) {
    return []; // These may indicate a temporary network issue; we return an empty array so polling can be retried
  }

  if (!Array.isArray(credentialResults)) {
    throw new Error("Response from /credentialResult is malformed");
  }

  return credentialResults;
}

export function expectTxmaEventToHaveBeenWritten(
  txmaEvents: EventResponse[],
  eventName: string,
) {
  expect(
    txmaEvents.some((item) => {
      return "event_name" in item.event && item.event.event_name === eventName;
    }),
  ).toBe(true);
}

export function getVcIssuedEventObject(txmaEvents: EventResponse[]): object {
  const eventResponse = txmaEvents.find(
    (item) =>
      item.event &&
      "event_name" in item.event &&
      item.event.event_name === "DCMAW_ASYNC_CRI_VC_ISSUED",
  );

  if (!eventResponse) {
    throw Error("VC ISSUED event not found.");
  }

  return eventResponse.event;
}

export enum Scenario {
  DRIVING_LICENCE_SUCCESS = "DRIVING_LICENCE_SUCCESS",
  DRIVING_LICENCE_FAILURE_WITH_CIS = "DRIVING_LICENCE_FAILURE_WITH_CIS",
  PASSPORT_SUCCESS = "PASSPORT_SUCCESS",
  PASSPORT_FAILURE_WITH_CIS = "PASSPORT_FAILURE_WITH_CIS",
  BRP_SUCCESS = "BRP_SUCCESS",
  BRC_SUCCESS = "BRC_SUCCESS",
  INVALID_BIOMETRIC_SESSION = "INVALID_BIOMETRIC_SESSION",
}

export async function doAsyncJourney(
  biometricSessionScenario: Scenario,
  biometricSessionOverrides?: { creationDate?: string; opaqueId?: string },
): Promise<{
  biometricSessionId: string;
  sessionId: string;
  subjectIdentifier: string;
}> {
  const subjectIdentifier = randomUUID();
  await createSessionForSub(subjectIdentifier);

  const sessionId = await getActiveSessionIdFromSub(subjectIdentifier);
  const issueBiometricTokenResponse = await issueBiometricToken(sessionId);

  const biometricSessionId = randomUUID();
  const creationDate =
    biometricSessionOverrides?.creationDate ?? new Date().toISOString();
  const opaqueId =
    biometricSessionOverrides?.opaqueId ??
    issueBiometricTokenResponse.data.opaqueId;

  await setupBiometricSessionByScenario(
    biometricSessionId,
    biometricSessionScenario,
    opaqueId,
    creationDate,
  );

  await finishBiometricSession(sessionId, biometricSessionId);

  return {
    biometricSessionId,
    sessionId,
    subjectIdentifier,
  };
}

export async function getVerifiedJwt(
  subjectIdentifier: string,
): Promise<JWTVerifyResult & ResolvedKey> {
  const credentialJwtFromQueue =
    await getCredentialFromIpvOutboundQueue(subjectIdentifier);

  const jwks = createRemoteJWKSet(
    new URL(`${process.env.SESSIONS_API_URL}/.well-known/jwks.json`),
  );

  const verifiedJwt = await jwtVerify(credentialJwtFromQueue, jwks, {
    algorithms: ["ES256"],
  });

  return verifiedJwt;
}
