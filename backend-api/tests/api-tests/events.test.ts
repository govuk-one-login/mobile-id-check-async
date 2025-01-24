import { AxiosInstance, AxiosResponse } from "axios";
import { randomUUID, UUID } from "crypto";
import "dotenv/config";
import {
  EVENTS_API_INSTANCE,
  PRIVATE_API_INSTANCE,
  PROXY_API_INSTANCE,
  SESSIONS_API_INSTANCE,
  STS_MOCK_API_INSTANCE,
} from "./utils/apiInstance";
import {
  ClientDetails,
  createSessionForSub,
  getFirstRegisteredClient,
} from "./utils/apiTestHelpers";

jest.useFakeTimers();
const ONE_SECOND = 1000;
jest.setTimeout(7 * 5 * ONE_SECOND);

interface IApiConfig {
  apiName: string;
  axiosInstance: AxiosInstance;
  authorizationHeader: string;
}

const getApisToTest = (): IApiConfig[] => {
  const proxyApiConfig = {
    apiName: "Proxy API",
    axiosInstance: PROXY_API_INSTANCE,
    authorizationHeader: "x-custom-auth",
  };
  const privateApiConfig = {
    apiName: "Private API",
    axiosInstance: PRIVATE_API_INSTANCE,
    authorizationHeader: "Authorization",
  };

  if (process.env.IS_LOCAL_TEST === "true") {
    return [proxyApiConfig]; // test only proxy API locally
  } else {
    return [proxyApiConfig, privateApiConfig]; // test both proxy and private APIs in the pipeline
  }
};

const APIS = getApisToTest();

describe.each(APIS)(
  "Test $apiName",
  ({ axiosInstance, authorizationHeader }) => {
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
      let clientIdAndSecret: string;
      let clientDetails: ClientDetails;
      let accessToken: string;
      let credentialRequestBody: CredentialRequestBody;
      let sub: string;
      let sessionId: string;

      beforeAll(async () => {
        clientDetails = await getFirstRegisteredClient();
        clientIdAndSecret = `${clientDetails.client_id}:${clientDetails.client_secret}`;
        accessToken = await getCredentialAccessToken(
          axiosInstance,
          clientIdAndSecret,
          authorizationHeader,
        );
        credentialRequestBody = getRequestBody(clientDetails);
        await createSession({
          axiosInstance,
          authorizationHeader,
          accessToken,
          requestBody: credentialRequestBody,
        });
        sub = randomUUID();
        sessionId = await getActiveSessionId(sub);
      });

      describe("Given a request is made with a query that is not valid", () => {
        it("Returns a 400 Bad Request response", async () => {
          const params = {
            skPrefix: `TXMA%23EVENT_NAME%23DCMAW_ASYNC_CRI_START`,
          };
          const response = await EVENTS_API_INSTANCE.get("/events", { params });

          expect(response.status).toBe(400);
          expect(response.statusText).toStrictEqual("Bad Request");
        });
      });

      describe("Given a request is made with a query that is valid", () => {
        it("Returns a 200 OK response", async () => {
          const params = {
            pkPrefix: `SESSION%23${sessionId}`,
            skPrefix: `TXMA%23EVENT_NAME%23DCMAW_ASYNC_CRI_START`,
          };

          setTimeout(async () => {
            const response = await EVENTS_API_INSTANCE.get("/events", {
              params,
            });

            expect(response.status).toBe(200);
            expect(response.statusText).toStrictEqual("OK");
          });
        });
      });
    });
  },
);

function toBase64(value: string): string {
  return Buffer.from(value).toString("base64");
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
