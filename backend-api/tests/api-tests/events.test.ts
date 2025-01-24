import { AxiosInstance } from "axios";
import { UUID } from "crypto";
import "dotenv/config";
import {
  EVENTS_API_INSTANCE,
  PRIVATE_API_INSTANCE,
  PROXY_API_INSTANCE,
} from "./utils/apiInstance";
import {
  ClientDetails,
  getFirstRegisteredClient,
} from "./utils/apiTestHelpers";

jest.setTimeout(4 * 5000);

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

      beforeAll(async () => {
        clientDetails = await getFirstRegisteredClient();
        clientIdAndSecret = `${clientDetails.client_id}:${clientDetails.client_secret}`;
        accessToken = await getAccessToken(
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

async function getAccessToken(
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
