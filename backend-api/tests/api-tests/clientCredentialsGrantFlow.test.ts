import { randomUUID } from "crypto";
import "dotenv/config";
import { APIS } from "./utils/apiInstance";
import {
  ClientDetails,
  CredentialRequestBody,
  getCredentialAccessToken,
  getCredentialRequestBody,
  getFirstRegisteredClient,
  toBase64,
} from "./utils/apiTestHelpers";

describe.each(APIS)(
  "Test $apiName",
  ({ axiosInstance, authorizationHeader }) => {
    let clientIdAndSecret: string;

    beforeAll(async () => {
      const clientDetails = await getFirstRegisteredClient();
      clientIdAndSecret = `${clientDetails.client_id}:${clientDetails.client_secret}`;
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
        const invalidClientIdAndSecret = "invalidClient:invalidClientSecret";
        const response = await axiosInstance.post(
          `/async/token`,
          "grant_type=client_credentials",
          {
            headers: {
              [authorizationHeader]:
                "Basic " + toBase64(invalidClientIdAndSecret),
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
      it("Returns a 200 OK response and the access token", async () => {
        const response = await axiosInstance.post(
          `/async/token`,
          "grant_type=client_credentials",
          {
            headers: {
              [authorizationHeader]: "Basic " + toBase64(clientIdAndSecret),
            },
          },
        );

        const accessTokenParts = response.data.access_token.split(".");
        const header = JSON.parse(fromBase64(accessTokenParts[0])) as object;
        const payload = JSON.parse(fromBase64(accessTokenParts[1])) as object;

        expect(response.data).toHaveProperty("access_token");
        expect(header).toHaveProperty("kid");
        expect(header).toHaveProperty("alg", "ES256");
        expect(header).toHaveProperty("typ", "JWT");
        expect(payload).toHaveProperty("aud");
        expect(payload).toHaveProperty("client_id");
        expect(payload).toHaveProperty("exp");
        expect(payload).toHaveProperty("iss");
        expect(payload).toHaveProperty("scope", "dcmaw.session.async_create");
        expect(response.data).toHaveProperty("expires_in", 3600);
        expect(response.data).toHaveProperty("token_type", "Bearer");
        expect(response.status).toBe(200);
      });
    });

    describe("POST /credential", () => {
      let clientDetails: ClientDetails;
      let credentialRequestBody: CredentialRequestBody;
      let accessToken: string;

      beforeAll(async () => {
        clientDetails = await getFirstRegisteredClient();
        const clientIdAndSecret = `${clientDetails.client_id}:${clientDetails.client_secret}`;
        accessToken = await getCredentialAccessToken(
          axiosInstance,
          clientIdAndSecret,
          authorizationHeader,
        );
        credentialRequestBody = getCredentialRequestBody(clientDetails);
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
        it("Returns 201 Created", async () => {
          const randomSub = randomUUID();
          const credentialRequestBody = getCredentialRequestBody(
            clientDetails,
            randomSub,
          );

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
            sub: randomSub,
          });
          expect(response.status).toBe(201);
        });
      });
    });
  },
);

function fromBase64(value: string): string {
  return Buffer.from(value, "base64").toString();
}

function makeSignatureUnverifiable(accessToken: string, newSignature: string) {
  accessToken = accessToken.substring(0, accessToken.lastIndexOf(".") + 1);
  return accessToken + newSignature;
}
