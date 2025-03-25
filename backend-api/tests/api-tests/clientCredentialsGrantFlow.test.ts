import { AxiosInstance, AxiosResponse } from "axios";
import { randomUUID, UUID } from "crypto";
import "dotenv/config";
import { PRIVATE_API_INSTANCE, PROXY_API_INSTANCE } from "./utils/apiInstance";
import {
  ClientDetails,
  getFirstRegisteredClient,
  getActiveSessionIdFromSub,
  pollForEvents,
} from "./utils/apiTestHelpers";

const getApisToTest = (): {
  apiName: string;
  axiosInstance: AxiosInstance;
  authorizationHeader: string;
}[] => {
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

const apis = getApisToTest();

describe.each(apis)(
  "Test $apiName",
  ({ axiosInstance, authorizationHeader }) => {
    let clientIdAndSecret: string;

    beforeAll(async () => {
      const clientDetails = await getFirstRegisteredClient();
      clientIdAndSecret = `${encodeURIComponent(clientDetails.client_id)}:${encodeURIComponent(clientDetails.client_secret)}`;
    });

    describe("Given there is no grant_type in the request body", () => {
      it("Returns a 400 Bad Request response", async () => {
        const response = await axiosInstance.post(`/async/token`, "", {
          headers: {
            [authorizationHeader]: "Basic " + toBase64(clientIdAndSecret),
          },
        });

        expect(response.data).toStrictEqual({
          error: "invalid_grant",
          error_description: "Invalid grant type or grant type not specified",
        });
        expect(response.status).toBe(400);
      });
    });

    describe("Given the grant_type value is invalid", () => {
      it("Returns a 400 Bad Request response", async () => {
        const response = await axiosInstance.post(
          `/async/token`,
          "grant_type=invalid_grant_type",
          {
            headers: {
              [authorizationHeader]: "Basic " + toBase64(clientIdAndSecret),
            },
          },
        );

        expect(response.data).toStrictEqual({
          error: "invalid_grant",
          error_description: "Invalid grant type or grant type not specified",
        });
        expect(response.status).toBe(400);
      });
    });

    describe("Given there is no Authorization header in the request", () => {
      it("Returns a 401 Unauthorized response", async () => {
        const response = await axiosInstance.post(
          `/async/token`,
          "grant_type=client_credentials",
        );

        expect(response.data).toStrictEqual({
          error: "invalid_client",
          error_description: "Invalid or missing authorization header",
        });
        expect(response.status).toBe(401);
      });
    });

    describe("Given the client in the Authorization header is not a registered client", () => {
      it("Returns a 400 Bad Request response", async () => {
        const response = await axiosInstance.post(
          `/async/token`,
          "grant_type=client_credentials",
          {
            headers: {
              [authorizationHeader]:
                "Basic " +
                toBase64(
                  `${encodeURIComponent("invalidClientId")}:${encodeURIComponent("invalidClientSecret")}`,
                ),
            },
          },
        );

        expect(response.data).toStrictEqual({
          error: "invalid_grant",
          error_description: "Supplied client credentials not recognised",
        });
        expect(response.status).toBe(400);
      });
    });

    describe("Given the request is valid and the client is registered", () => {
      let tokenResponse: AxiosResponse;
      let accessTokenParts: string[];
      let header: object;
      let payload: object;

      beforeAll(async () => {
        tokenResponse = await axiosInstance.post(
          `/async/token`,
          "grant_type=client_credentials",
          {
            headers: {
              [authorizationHeader]: "Basic " + toBase64(clientIdAndSecret),
            },
          },
        );

        accessTokenParts = tokenResponse.data.access_token.split(".");
        header = JSON.parse(fromBase64(accessTokenParts[0])) as object;
        payload = JSON.parse(fromBase64(accessTokenParts[1])) as object;
      });

      it("Returns a 200 OK response and the access token", async () => {
        expect(tokenResponse.data).toHaveProperty("access_token");
        expect(header).toHaveProperty("kid");
        expect(header).toHaveProperty("alg", "ES256");
        expect(header).toHaveProperty("typ", "JWT");
        expect(payload).toHaveProperty("aud");
        expect(payload).toHaveProperty("client_id");
        expect(payload).toHaveProperty("exp");
        expect(payload).toHaveProperty("iss");
        expect(payload).toHaveProperty("scope", "dcmaw.session.async_create");
        expect(tokenResponse.data).toHaveProperty("expires_in", 3600);
        expect(tokenResponse.data).toHaveProperty("token_type", "Bearer");
        expect(tokenResponse.status).toBe(200);
      });

      it("Writes an event with the correct event_name", async () => {
        const eventsResponse = await pollForEvents({
          partitionKey: `SESSION#UNKNOWN`,
          sortKeyPrefix: `TXMA#EVENT_NAME#DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED`,
          numberOfEvents: 1,
        });

        expect(eventsResponse[0].event).toEqual(
          expect.objectContaining({
            event_name: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
          }),
        );
      }, 40000);
    });

    describe("POST /credential", () => {
      let clientDetails: ClientDetails;
      let accessToken: string;
      let credentialRequestBody: CredentialRequestBody;

      beforeAll(async () => {
        clientDetails = await getFirstRegisteredClient();
        const clientIdAndSecret = `${clientDetails.client_id}:${clientDetails.client_secret}`;
        accessToken = await getAccessToken(
          axiosInstance,
          clientIdAndSecret,
          authorizationHeader,
        );
        credentialRequestBody = getRequestBody(clientDetails);
      });

      describe("Given there is no Authorization header in the request", () => {
        it("Returns a 401 Unauthorized response", async () => {
          const response = await axiosInstance.post(
            `/async/credential`,
            credentialRequestBody,
          );

          expect(response.data).toStrictEqual({
            error: "invalid_token",
            error_description: "Invalid or missing authorization header",
          });
          expect(response.status).toBe(401);
        });
      });

      describe("Given the Bearer token in the Authorization header is not a valid token", () => {
        it("Returns a 400 Bad Request response", async () => {
          const response = await axiosInstance.post(
            `/async/credential`,
            credentialRequestBody,
            {
              headers: {
                [authorizationHeader]: "Bearer invalid.access.token",
              },
            },
          );

          expect(response.data).toStrictEqual({
            error: "invalid_token",
            error_description: "JWT payload not valid JSON",
          });
          expect(response.status).toBe(400);
        });
      });

      describe("Given the request body is invalid", () => {
        it("Returns a 400 Bad Request response", async () => {
          const response = await axiosInstance.post(
            `/async/credential`,
            "invalidRequestBody",
            {
              headers: {
                [authorizationHeader]: "Bearer " + accessToken,
              },
            },
          );

          expect(response.data).toStrictEqual({
            error: "invalid_request",
            error_description: "Request body validation failed",
          });
          expect(response.status).toBe(400);
        });
      });

      describe("Given the access token signature could not be verified", () => {
        it("Returns 400 Bad Request", async () => {
          const accessTokenWithInvalidSignature = makeSignatureUnverifiable(
            accessToken,
            "6T5a8kCTyXsmw_2ATkyPgtLRzsuot-_ZIXWnuXNftZP8SHHkNxwFyMaZxEnqqtQst-99AoRrUDZnPov0oztbSA",
          );

          const response = await axiosInstance.post(
            `/async/credential`,
            credentialRequestBody,
            {
              headers: {
                [authorizationHeader]:
                  "Bearer " + accessTokenWithInvalidSignature,
              },
            },
          );

          expect(response.data).toStrictEqual({
            error: "invalid_request",
            error_description: "Invalid signature",
          });
          expect(response.status).toBe(400);
        });
      });

      describe("Given the request is valid and an active session is found for a given sub", () => {
        it("Returns 200 OK", async () => {
          // Create session if it does not exist
          await axiosInstance.post(`/async/credential`, credentialRequestBody, {
            headers: {
              [authorizationHeader]: "Bearer " + accessToken,
            },
          });

          const response = await axiosInstance.post(
            `/async/credential`,
            credentialRequestBody,
            {
              headers: {
                [authorizationHeader]: "Bearer " + accessToken,
              },
            },
          );

          expect(response.data).toStrictEqual({
            "https://vocab.account.gov.uk/v1/credentialStatus": "pending",
            sub: "urn:fdc:gov.uk:2022:56P4CMsGh_02YOlWpd8PAOI-2sVlB2nsNU7mcLZYhYw=",
          });
          expect(response.status).toBe(200);
        });
      });

      describe("Given the same access token is used more than once to fetch an active session", () => {
        it("Returns 200 OK", async () => {
          // use access token once
          const responseOne = await axiosInstance.post(
            `/async/credential`,
            credentialRequestBody,
            {
              headers: {
                [authorizationHeader]: "Bearer " + accessToken,
              },
            },
          );

          // use access token twice
          const responseTwo = await axiosInstance.post(
            `/async/credential`,
            credentialRequestBody,
            {
              headers: {
                [authorizationHeader]: "Bearer " + accessToken,
              },
            },
          );

          expect(responseOne.data).toStrictEqual({
            "https://vocab.account.gov.uk/v1/credentialStatus": "pending",
            sub: "urn:fdc:gov.uk:2022:56P4CMsGh_02YOlWpd8PAOI-2sVlB2nsNU7mcLZYhYw=",
          });
          expect(responseOne.status).toBe(200);
          expect(responseTwo.data).toStrictEqual({
            "https://vocab.account.gov.uk/v1/credentialStatus": "pending",
            sub: "urn:fdc:gov.uk:2022:56P4CMsGh_02YOlWpd8PAOI-2sVlB2nsNU7mcLZYhYw=",
          });
          expect(responseTwo.status).toBe(200);
        });
      });

      describe("Given the request is valid and there is no active session for the given sub", () => {
        let randomSub: UUID;
        let response: AxiosResponse;

        beforeAll(async () => {
          randomSub = randomUUID();
          const credentialRequestBody = getRequestBody(
            clientDetails,
            randomSub,
          );

          response = await axiosInstance.post(
            `/async/credential`,
            credentialRequestBody,
            {
              headers: {
                [authorizationHeader]: "Bearer " + accessToken,
              },
            },
          );
        });

        it("Returns 201 Created", async () => {
          expect(response.status).toBe(201);
          expect(response.data).toStrictEqual({
            "https://vocab.account.gov.uk/v1/credentialStatus": "pending",
            sub: randomSub,
          });
        });

        it("Writes an event with the correct event_name", async () => {
          const sessionId = await getActiveSessionIdFromSub(randomSub);
          const eventsResponse = await pollForEvents({
            partitionKey: `SESSION#${sessionId}`,
            sortKeyPrefix: `TXMA#EVENT_NAME#DCMAW_ASYNC_CRI_START`,
            numberOfEvents: 1,
          });

          expect(eventsResponse[0].event).toEqual(
            expect.objectContaining({
              event_name: "DCMAW_ASYNC_CRI_START",
            }),
          );
        }, 40000);
      });
    });
  },
);

function toBase64(value: string): string {
  return Buffer.from(value).toString("base64");
}

function fromBase64(value: string): string {
  return Buffer.from(value, "base64").toString();
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

function makeSignatureUnverifiable(accessToken: string, newSignature: string) {
  accessToken = accessToken.substring(0, accessToken.lastIndexOf(".") + 1);
  return accessToken + newSignature;
}
