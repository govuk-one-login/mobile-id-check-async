import { AxiosInstance, AxiosResponse } from "axios";
import { randomUUID } from "crypto";
import "dotenv/config";
import {
  APIS,
  EVENTS_API_INSTANCE,
  SESSIONS_API_INSTANCE,
  STS_MOCK_API_INSTANCE,
} from "./utils/apiInstance";
import {
  ClientDetails,
  createSessionForSub,
  CredentialRequestBody,
  getCredentialAccessToken,
  getCredentialRequestBody,
  getFirstRegisteredClient,
} from "./utils/apiTestHelpers";

const ONE_SECOND = 1000;
jest.setTimeout(2 * 5 * ONE_SECOND);

describe("GET /events", () => {
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

          beforeEach(async () => {
            clientDetails = await getFirstRegisteredClient();
            clientIdAndSecret = `${clientDetails.client_id}:${clientDetails.client_secret}`;
            accessToken = await getCredentialAccessToken(
              axiosInstance,
              clientIdAndSecret,
              authorizationHeader,
            );
            credentialRequestBody = getCredentialRequestBody(clientDetails);
            await createSession({
              axiosInstance,
              authorizationHeader,
              accessToken,
              requestBody: credentialRequestBody,
            });
            sub = randomUUID();
            sessionId = await getActiveSessionId(sub);
          });

          it("Returns a 200 OK response", async () => {
            const params = {
              pkPrefix: `SESSION#${sessionId}`,
              skPrefix: `TXMA#EVENT_NAME#DCMAW_ASYNC_CRI_START`,
            };

            await new Promise((resolve) => setTimeout(resolve, 7000));

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
    },
  );
});

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
