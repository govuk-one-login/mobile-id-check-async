import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { aws4Interceptor } from "aws4-axios";
import axios, { AxiosInstance } from "axios";
import axiosRetry from "axios-retry";
import { randomUUID, UUID } from "crypto";
import "dotenv/config";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

const ONE_SECOND = 1000;
jest.setTimeout(7 * 5 * ONE_SECOND);

describe("GET /events", () => {
  describe("Given there are no events to dequeue", () => {
    it("Returns a 404 Not Found response", async () => {
      const params = {
        pkPrefix: `SESSION%23`,
        skPrefix: `TXMA%23EVENT_NAME%23DCMAW_ASYNC_CRI_START`,
      };
      const response = await EVENTS_API_INSTANCE.get("/events", { params });

      expect(response.status).toBe(404);
      expect(response.statusText).toStrictEqual("Not Found");
    });
  });

  describe("Given there are events to dequeue", () => {
    describe("Given a request is made with a query that is not valid", () => {
      it("Returns a 400 Bad Request response", async () => {
        const params = {
          skPrefix: `TXMA%23EVENT_NAME%23DCMAW_ASYNC_CRI_START`,
        };
        const response = await EVENTS_API_INSTANCE.get("/events", {
          params,
        });

        expect(response.status).toBe(400);
        expect(response.statusText).toEqual("Bad Request");
      });
    });

    describe("Given a request is made with a query that is valid", () => {
      let clientIdAndSecret: string;
      let clientDetails: ClientDetails;
      let accessToken: string;
      let credentialRequestBody: CredentialRequestBody;
      let sub: string;
      let sessionId: string;
      const PROXY_API_INSTANCE = getProxyApiInstance();
      const authorizationHeader = "x-custom-auth";

      beforeEach(async () => {
        clientDetails = await getFirstRegisteredClient();
        clientIdAndSecret = `${clientDetails.client_id}:${clientDetails.client_secret}`;
        accessToken = await getCredentialAccessToken(
          PROXY_API_INSTANCE,
          clientIdAndSecret,
          authorizationHeader,
        );
        credentialRequestBody = getCredentialRequestBody(clientDetails);
        await createSession({
          axiosInstance: PROXY_API_INSTANCE,
          authorizationHeader,
          accessToken,
          requestBody: credentialRequestBody,
        });
        sub = randomUUID();
        sessionId = await getActiveSessionId(sub);
      });

      it("Returns a 200 OK response", async () => {
        console.log("SUB >>>>>", sub);
        console.log("SESSION ID >>>>>", sessionId);

        const params = {
          pkPrefix: `SESSION#${sessionId}`,
          skPrefix: `TXMA#EVENT_NAME#DCMAW_ASYNC_CRI_START`,
        };

        await new Promise((resolve) => setTimeout(resolve, 5000));

        const response = await EVENTS_API_INSTANCE.get("/events", {
          params,
        });

        expect(response.status).toBe(200);
        expect(response.statusText).toEqual("OK");
        expect(response.data[0].pk).toEqual(`SESSION#${sessionId}`);
        expect(response.data[0].sk).toEqual(
          expect.stringContaining(
            "TXMA#EVENT_NAME#DCMAW_ASYNC_CRI_START#TIMESTAMP#",
          ),
        );
        const event = response.data[0].event;
        expect(event).toEqual(
          expect.objectContaining({
            event_name: "DCMAW_ASYNC_CRI_START",
          }),
        );
      });
    });
  });
});

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

const STS_MOCK_API_INSTANCE = getStsMockInstance();
const SESSIONS_API_INSTANCE = getSessionsApiInstance();
const PROXY_API_INSTANCE = getProxyApiInstance();
const EVENTS_API_INSTANCE = getEventsApiInstance();

interface ClientDetails {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
}

interface CredentialRequestBody {
  sub: string;
  govuk_signin_journey_id: string;
  client_id: string;
  state: string;
  redirect_uri: string;
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

function getCredentialRequestBody(
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

function toBase64(value: string): string {
  return Buffer.from(value).toString("base64");
}

async function getCredentialAccessToken(
  apiInstance: AxiosInstance,
  clientIdAndSecret: string,
  authorizationHeader: string,
): Promise<string> {
  const response = await apiInstance.post(
    `/async/token`,
    "grant_type=client_credentials",
    {
      headers: {
        [authorizationHeader]: "Basic " + toBase64(clientIdAndSecret),
      },
    },
  );

  return response.data.access_token as string;
}

async function createSession(requestConfig: {
  axiosInstance: AxiosInstance;
  authorizationHeader: string;
  accessToken: string;
  requestBody: CredentialRequestBody;
}): Promise<void> {
  const { axiosInstance, authorizationHeader, accessToken, requestBody } =
    requestConfig;
  axiosInstance.post(`/async/credential`, requestBody, {
    headers: {
      [authorizationHeader]: "Bearer " + accessToken,
    },
  });
}

async function getActiveSessionAccessToken(
  sub?: string,
  scope?: string,
): Promise<string> {
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

async function getActiveSessionId(sub: string): Promise<string> {
  await createSessionForSub(sub);
  const accessToken = await getActiveSessionAccessToken(sub);
  const { sessionId } = (
    await SESSIONS_API_INSTANCE.get("/async/activeSession", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  ).data;

  return sessionId;
}
