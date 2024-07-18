import { APIGatewayProxyResult } from "aws-lambda";
import { buildRequest } from "../testUtils/mockRequest";
import { IVerifyTokenSignature } from "./TokenService/tokenService";
import { Dependencies, lambdaHandler } from "./asyncCredentialHandler";
import {
  IClientCredentials,
  IClientCredentialsService,
} from "../services/clientCredentialsService/clientCredentialsService";
import { IGetClientCredentials } from "../asyncToken/ssmService/ssmService";
import {
  ErrorOrSuccess,
  errorResponse,
  successResponse,
} from "../types/errorOrValue";
import { IRecoverAuthSession } from "./sessionService/sessionService";
import { MockJWTBuilder } from "../testUtils/mockJwt";

const env = {
  SIGNING_KEY_ID: "mockKid",
  ISSUER: "mockIssuer",
  SESSION_TABLE_NAME: "mockTableName",
  SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME: "mockIndexName",
  SESSION_RECOVERY_TIMEOUT: "12345",
};

describe("Async Credential", () => {
  let dependencies: Dependencies;

  beforeEach(() => {
    dependencies = {
      tokenService: () => new MockTokenSeviceValidSignature(),
      ssmService: () => new MockPassingSsmService(),
      clientCredentialsService: () => new MockPassingClientCredentialsService(),
      getRecoverSessionService: () =>
        new MockNoRecoverableSessionRecoverSessionService(
          env.SESSION_TABLE_NAME,
          env.SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME,
        ),
      env,
    };
  });

  describe("Environment variable validation", () => {
    describe("Given SIGNING_KEY_ID is missing", () => {
      it("Returns a 500 Server Error response", async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        delete dependencies.env["SIGNING_KEY_ID"];
        const event = buildRequest();
        const result = await lambdaHandler(event, dependencies);

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 500,
          body: JSON.stringify({
            error: "server_error",
            error_description: "Server Error",
          }),
        });
      });
    });

    describe("Given ISSUER is missing", () => {
      it("Returns a 500 Server Error response", async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        delete dependencies.env["ISSUER"];
        const event = buildRequest();
        const result = await lambdaHandler(event, dependencies);

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 500,
          body: JSON.stringify({
            error: "server_error",
            error_description: "Server Error",
          }),
        });
      });
    });

    describe("Given SESSION_TABLE_NAME is missing", () => {
      it("Returns a 500 Server Error response", async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        delete dependencies.env["SESSION_TABLE_NAME"];
        const event = buildRequest();
        const result = await lambdaHandler(event, dependencies);

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 500,
          body: JSON.stringify({
            error: "server_error",
            error_description: "Server Error",
          }),
        });
      });
    });

    describe("Given SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME is missing", () => {
      it("Returns a 500 Server Error response", async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        delete dependencies.env["SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME"];
        const event = buildRequest();
        const result = await lambdaHandler(event, dependencies);

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 500,
          body: JSON.stringify({
            error: "server_error",
            error_description: "Server Error",
          }),
        });
      });
    });

    describe("Given SESSION_RECOVERY_TIMEOUT is missing", () => {
      it("Returns a 500 Server Error response", async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        delete dependencies.env["SESSION_RECOVERY_TIMEOUT"];
        const event = buildRequest();
        const result = await lambdaHandler(event, dependencies);

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 500,
          body: JSON.stringify({
            error: "server_error",
            error_description: "Server Error",
          }),
        });
      });
    });

    describe("Given SESSION_RECOVERY_TIMEOUT value is not a number", () => {
      it("Returns a 500 Server Error response", async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        dependencies.env["SESSION_RECOVERY_TIMEOUT"] =
          "mockInvalidSessionRecoveryTimeout";
        const event = buildRequest();
        const result = await lambdaHandler(event, dependencies);

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 500,
          body: JSON.stringify({
            error: "server_error",
            error_description: "Server Error",
          }),
        });
      });
    });
  });

  describe("Access token validation", () => {
    describe("Given Authentication header is missing", () => {
      it("Returns 401 Unauthorized", async () => {
        const event = buildRequest();

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 401,
          body: JSON.stringify({
            error: "Unauthorized",
            error_description: "Invalid token",
          }),
        });
      });
    });

    describe("Given access token does not start with Bearer", () => {
      it("Returns 401 Unauthorized", async () => {
        const event = buildRequest({
          headers: { Authorization: "noBearerString mockToken" },
        });

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 401,
          body: JSON.stringify({
            error: "Unauthorized",
            error_description: "Invalid token",
          }),
        });
      });
    });

    describe("Given Bearer token is not in expected format - contains spaces", () => {
      it("Returns 401 Unauthorized", async () => {
        const event = buildRequest({
          headers: { Authorization: "Bearer mock token" },
        });

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 401,
          body: JSON.stringify({
            error: "Unauthorized",
            error_description: "Invalid token",
          }),
        });
      });
    });

    describe("Given Bearer token is not in expected format - missing token", () => {
      it("Returns 401 Unauthorized", async () => {
        const event = buildRequest({
          headers: { Authorization: "Bearer " },
        });

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 401,
          body: JSON.stringify({
            error: "Unauthorized",
            error_description: "Invalid token",
          }),
        });
      });
    });
  });

  describe("JWT payload validation", () => {
    describe("exp claim validation", () => {
      describe("Given expiry date is missing", () => {
        it("Returns a log", async () => {
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.deleteExp();
          const event = buildRequest({
            headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
          });

          dependencies.tokenService = () => new MockTokenSeviceValidSignature();

          const result: APIGatewayProxyResult = await lambdaHandler(
            event,
            dependencies,
          );

          expect(result).toStrictEqual({
            headers: { "Content-Type": "application/json" },
            statusCode: 400,
            body: JSON.stringify({
              error: "invalid_token",
              error_description: "Missing exp claim",
            }),
          });
        });
      });

      describe("Given expiry date is in the past", () => {
        it("Returns a log", async () => {
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.setExp(Math.floor(Date.now() - 1000) / 1000);
          const event = buildRequest({
            headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
          });

          dependencies.tokenService = () => new MockTokenSeviceValidSignature();

          const result: APIGatewayProxyResult = await lambdaHandler(
            event,
            dependencies,
          );

          expect(result).toStrictEqual({
            headers: { "Content-Type": "application/json" },
            statusCode: 400,
            body: JSON.stringify({
              error: "invalid_token",
              error_description: "exp claim is in the past",
            }),
          });
        });
      });
    });

    describe("iat claim validation", () => {
      // iat does not need to be present
      describe("Given issued at (iat) is in the future", () => {
        it("Returns a log", async () => {
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.setIat(Math.floor(Date.now() + 1000) / 1000);
          const event = buildRequest({
            headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
          });

          dependencies.tokenService = () => new MockTokenSeviceValidSignature();

          const result: APIGatewayProxyResult = await lambdaHandler(
            event,
            dependencies,
          );

          expect(result).toStrictEqual({
            headers: { "Content-Type": "application/json" },
            statusCode: 400,
            body: JSON.stringify({
              error: "invalid_token",
              error_description: "iat claim is in the future",
            }),
          });
        });
      });
    });

    describe("nbf claim validation", () => {
      // nbf does not need to be present
      describe("Given not before (nbf) is in the future", () => {
        it("Returns a log", async () => {
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.setNbf(Date.now() + 1000);
          const event = buildRequest({
            headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
          });

          dependencies.tokenService = () => new MockTokenSeviceValidSignature();

          const result: APIGatewayProxyResult = await lambdaHandler(
            event,
            dependencies,
          );

          expect(result).toStrictEqual({
            headers: { "Content-Type": "application/json" },
            statusCode: 400,
            body: JSON.stringify({
              error: "invalid_token",
              error_description: "nbf claim is in the future",
            }),
          });
        });
      });
    });

    describe("iss claim validation", () => {
      describe("Given issuer (iss) is missing", () => {
        it("Returns a log", async () => {
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.deleteIss();
          const event = buildRequest({
            headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
          });

          dependencies.tokenService = () => new MockTokenSeviceValidSignature();

          const result: APIGatewayProxyResult = await lambdaHandler(
            event,
            dependencies,
          );

          expect(result).toStrictEqual({
            headers: { "Content-Type": "application/json" },
            statusCode: 400,
            body: JSON.stringify({
              error: "invalid_token",
              error_description: "Missing iss claim",
            }),
          });
        });
      });

      describe("Given issuer (iss) is does not match environment variable", () => {
        it("Returns a log", async () => {
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.setIss("invalidIss");
          const event = buildRequest({
            headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
          });

          dependencies.tokenService = () => new MockTokenSeviceValidSignature();

          const result: APIGatewayProxyResult = await lambdaHandler(
            event,
            dependencies,
          );

          expect(result).toStrictEqual({
            headers: { "Content-Type": "application/json" },
            statusCode: 400,
            body: JSON.stringify({
              error: "invalid_token",
              error_description: "iss claim does not match registered issuer",
            }),
          });
        });
      });
    });

    describe("scope claim validation", () => {
      describe("Given scope is missing", () => {
        it("Returns a log", async () => {
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.deleteScope();
          const event = buildRequest({
            headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
          });

          dependencies.tokenService = () => new MockTokenSeviceValidSignature();

          const result: APIGatewayProxyResult = await lambdaHandler(
            event,
            dependencies,
          );

          expect(result).toStrictEqual({
            headers: { "Content-Type": "application/json" },
            statusCode: 400,
            body: JSON.stringify({
              error: "invalid_token",
              error_description: "Missing scope claim",
            }),
          });
        });
      });

      describe("Given scope is not dcmaw.session.async_create", () => {
        it("Returns a log", async () => {
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.setScope("invalidScope");
          const event = buildRequest({
            headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
          });

          dependencies.tokenService = () => new MockTokenSeviceValidSignature();

          const result: APIGatewayProxyResult = await lambdaHandler(
            event,
            dependencies,
          );

          expect(result).toStrictEqual({
            headers: { "Content-Type": "application/json" },
            statusCode: 400,
            body: JSON.stringify({
              error: "invalid_token",
              error_description: "Invalid scope claim",
            }),
          });
        });
      });
    });

    describe("client_id claim validation", () => {
      describe("Given client_id is missing", () => {
        it("Returns a log", async () => {
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.deleteClientId();
          const event = buildRequest({
            headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
          });

          dependencies.tokenService = () => new MockTokenSeviceValidSignature();

          const result: APIGatewayProxyResult = await lambdaHandler(
            event,
            dependencies,
          );

          expect(result).toStrictEqual({
            headers: { "Content-Type": "application/json" },
            statusCode: 400,
            body: JSON.stringify({
              error: "invalid_token",
              error_description: "Missing client_id claim",
            }),
          });
        });
      });
    });

    describe("aud claim validation", () => {
      describe("Given aud (audience) is missing", () => {
        it("Returns a log", async () => {
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.deleteAud();
          const event = buildRequest({
            headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
          });

          dependencies.tokenService = () => new MockTokenSeviceValidSignature();

          const result: APIGatewayProxyResult = await lambdaHandler(
            event,
            dependencies,
          );

          expect(result).toStrictEqual({
            headers: { "Content-Type": "application/json" },
            statusCode: 400,
            body: JSON.stringify({
              error: "invalid_token",
              error_description: "Missing aud claim",
            }),
          });
        });
      });
    });
  });

  describe("Request body validation", () => {
    describe("Given body is missing", () => {
      it("Returns 400 status code with invalid_request error", async () => {
        const jwtBuilder = new MockJWTBuilder();
        const event = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
          body: undefined,
        });

        dependencies.tokenService = () => new MockTokenSeviceValidSignature();

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "Missing request body",
          }),
        });
      });
    });

    describe("Given body contains invalid JSON", () => {
      const invalidJsonCases = [
        ["an empty string", ""],
        ["a plain string", "This is not JSON!"],
        ["an object with an unquoted key", "{key: 'value'}"],
        ["malformed JSON", '{"key": value}'],
      ];
      test.each(invalidJsonCases)(
        "Returns 400 status code with invalid_request error when body is %s",
        async (_description, invalidJson) => {
          const jwtBuilder = new MockJWTBuilder();
          const event = buildRequest({
            headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
            body: invalidJson,
          });

          dependencies.tokenService = () => new MockTokenSeviceValidSignature();

          const result: APIGatewayProxyResult = await lambdaHandler(
            event,
            dependencies,
          );

          expect(result).toStrictEqual({
            headers: { "Content-Type": "application/json" },
            statusCode: 400,
            body: JSON.stringify({
              error: "invalid_request",
              error_description: "Invalid JSON in request body",
            }),
          });
        },
      );
    });

    describe("Given state is missing", () => {
      it("Returns 400 status code with invalid_request error", async () => {
        const jwtBuilder = new MockJWTBuilder();
        const event = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
          body: JSON.stringify({}),
        });

        dependencies.tokenService = () => new MockTokenSeviceValidSignature();

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "Missing state in request body",
          }),
        });
      });
    });

    describe("Given sub is missing", () => {
      it("Returns 400 status code with invalid_request error", async () => {
        const jwtBuilder = new MockJWTBuilder();
        const event = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
          body: JSON.stringify({
            state: "mockState",
          }),
        });

        dependencies.tokenService = () => new MockTokenSeviceValidSignature();

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "Missing sub in request body",
          }),
        });
      });
    });

    describe("Given client_id is missing", () => {
      it("Returns 400 status code with invalid_request error", async () => {
        const jwtBuilder = new MockJWTBuilder();
        const event = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
          body: JSON.stringify({
            state: "mockState",
            sub: "mockSub",
          }),
        });

        dependencies.tokenService = () => new MockTokenSeviceValidSignature();

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "Missing client_id in request body",
          }),
        });
      });
    });

    describe("Given client_id is invalid", () => {
      it("Returns 400 status code with invalid_request error", async () => {
        const jwtBuilder = new MockJWTBuilder();
        const event = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
          body: JSON.stringify({
            state: "mockState",
            sub: "mockSub",
            client_id: "mockInvalidClientId",
          }),
        });

        dependencies.tokenService = () => new MockTokenSeviceValidSignature();

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description:
              "client_id in request body does not match client_id in access token",
          }),
        });
      });
    });

    describe("Given govuk_signin_journey_id is missing", () => {
      it("Returns 400 status code with invalid_request error", async () => {
        const jwtBuilder = new MockJWTBuilder();
        const event = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
          body: JSON.stringify({
            state: "mockState",
            sub: "mockSub",
            client_id: "mockClientId",
          }),
        });

        dependencies.tokenService = () => new MockTokenSeviceValidSignature();

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description:
              "Missing govuk_signin_journey_id in request body",
          }),
        });
      });
    });

    describe("Given redirect_uri is not a valid URL", () => {
      it("Returns 400 status code with invalid_request error", async () => {
        const jwtBuilder = new MockJWTBuilder();
        const event = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
          body: JSON.stringify({
            state: "mockState",
            sub: "mockSub",
            client_id: "mockClientId",
            govuk_signin_journey_id: "mockGovukSigninJourneyId",
            redirect_uri: "mockInvalidUrl",
          }),
        });

        dependencies.tokenService = () => new MockTokenSeviceValidSignature();

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "Invalid redirect_uri",
          }),
        });
      });
    });
  });

  describe("Request body validation - using Client Credentials", () => {
    describe("Given redirect_uri is present and the request body validation fails", () => {
      it("Returns a 400 Bad Request response", async () => {
        const jwtBuilder = new MockJWTBuilder();
        const event = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
          body: JSON.stringify({
            state: "mockState",
            sub: "mockSub",
            client_id: "mockClientId",
            govuk_signin_journey_id: "mockGovukSigninJourneyId",
            redirect_uri: "https://mockInvalidRedirectUri.com",
          }),
        });
        dependencies.clientCredentialsService = () =>
          new MockFailingClientCredentialsService();

        const result = await lambdaHandler(event, dependencies);

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "mockClientCredentialServiceError",
          }),
        });
      });
    });
  });

  describe("JWT signature verification", () => {
    describe("Given that the JWT signature verification fails", () => {
      it("Returns 401 Unauthorized", async () => {
        dependencies.tokenService = () => new MockTokenSeviceInvalidSignature();

        const jwtBuilder = new MockJWTBuilder();
        const event = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
          body: JSON.stringify({
            state: "mockState",
            sub: "mockSub",
            client_id: "mockClientId",
            govuk_signin_journey_id: "mockGovukSigninJourneyId",
          }),
        });

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 401,
          body: JSON.stringify({
            error: "Unauthorized",
            error_description: "Invalid signature",
          }),
        });
      });
    });
  });

  describe("SSM Service", () => {
    describe("Given there is an error retrieving client credentials from SSM", () => {
      it("Returns a 500 Server Error response", async () => {
        dependencies.ssmService = () => new MockFailingSsmService();
        const jwtBuilder = new MockJWTBuilder();
        const event = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
          body: JSON.stringify({
            state: "mockState",
            sub: "mockSub",
            client_id: "mockClientId",
            govuk_signin_journey_id: "mockGovukSigninJourneyId",
          }),
        });

        const result = await lambdaHandler(event, dependencies);

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 500,
          body: JSON.stringify({
            error: "server_error",
            error_description: "Server Error",
          }),
        });
      });
    });
  });

  describe("Client Credentials Service - get client credentials by ID", () => {
    describe("Given credentials are not found", () => {
      it("Returns 400 Bad Request response", async () => {
        const jwtBuilder = new MockJWTBuilder();
        const event = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
          body: JSON.stringify({
            state: "mockState",
            sub: "mockSub",
            client_id: "mockClientId",
            govuk_signin_journey_id: "mockGovukSigninJourneyId",
          }),
        });
        dependencies.clientCredentialsService = () =>
          new MockFailingClientCredentialsServiceGetClientCredentialsById();

        const result = await lambdaHandler(event, dependencies);

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_client",
            error_description: "Supplied client not recognised",
          }),
        });
      });
    });
  });

  describe("JWT Payload validation - using Client Credentials", () => {
    describe("aud claim does not match registered issuer for given client", () => {
      it("Returns a 400 Bad request response", async () => {
        const jwtBuilder = new MockJWTBuilder();
        jwtBuilder.setAud("invalidAud");
        const event = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
          body: JSON.stringify({
            state: "mockState",
            sub: "mockSub",
            client_id: "mockClientId",
            govuk_signin_journey_id: "mockGovukSigninJourneyId",
          }),
        });
        dependencies.clientCredentialsService = () =>
          new MockPassingClientCredentialsService();

        const result = await lambdaHandler(event, dependencies);

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_client",
            error_description: "Invalid aud claim",
          }),
        });
      });
    });
  });

  describe("Session recovery service", () => {
    describe("Given service returns an error response", () => {
      it("Returns 500 Server Error", async () => {
        const jwtBuilder = new MockJWTBuilder();
        const event = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
          body: JSON.stringify({
            state: "mockState",
            sub: "mockSub",
            client_id: "mockClientId",
            govuk_signin_journey_id: "mockGovukSigninJourneyId",
          }),
        });
        dependencies.getRecoverSessionService = () =>
          new MockFailingRecoverSessionService(
            env.SESSION_TABLE_NAME,
            env.SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME,
          );

        const result = await lambdaHandler(event, dependencies);

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 500,
          body: JSON.stringify({
            error: "server_error",
            error_description: "Server Error",
          }),
        });
      });
    });

    describe("Given service returns success response", () => {
      describe("Given response value is the authSessionId string", () => {
        it("Returns 200 session recovered response", async () => {
          const jwtBuilder = new MockJWTBuilder();
          const event = buildRequest({
            headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
            body: JSON.stringify({
              state: "mockState",
              sub: "mockSub",
              client_id: "mockClientId",
              govuk_signin_journey_id: "mockGovukSigninJourneyId",
            }),
          });
          dependencies.getRecoverSessionService = () =>
            new MockSessionRecoveredRecoverSessionService(
              env.SESSION_TABLE_NAME,
              env.SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME,
            );

          const result = await lambdaHandler(event, dependencies);

          expect(result).toStrictEqual({
            headers: { "Content-Type": "application/json" },
            statusCode: 200,
            body: JSON.stringify({
              sub: "mockSub",
              "https://vocab.account.gov.uk/v1/credentialStatus": "pending",
            }),
          });
        });
      });

      describe("Given response value is null", () => {
        it("Returns 200 Hello World response", async () => {
          const mockJwt = new MockJWTBuilder();
          const event = buildRequest({
            headers: { Authorization: `Bearer ${mockJwt.getEncodedJwt()}` },
            body: JSON.stringify({
              state: "mockState",
              sub: "mockSub",
              client_id: "mockClientId",
              govuk_signin_journey_id: "mockGovukSigninJourneyId",
            }),
          });
          dependencies.getRecoverSessionService = () =>
            new MockNoRecoverableSessionRecoverSessionService(
              env.SESSION_TABLE_NAME,
              env.SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME,
            );

          const result = await lambdaHandler(event, dependencies);

          expect(result).toStrictEqual({
            headers: { "Content-Type": "application/json" },
            statusCode: 200,
            body: JSON.stringify({
              message: "Hello World",
            }),
          });
        });
      });
    });
  });
});

class MockTokenSeviceInvalidSignature implements IVerifyTokenSignature {
  verifyTokenSignature(): Promise<ErrorOrSuccess<null>> {
    return Promise.resolve(errorResponse("Invalid signature"));
  }
}

class MockTokenSeviceValidSignature implements IVerifyTokenSignature {
  verifyTokenSignature(): Promise<ErrorOrSuccess<null>> {
    return Promise.resolve(successResponse(null));
  }
}

class MockFailingClientCredentialsServiceGetClientCredentialsById
  implements IClientCredentialsService
{
  validateTokenRequest(): ErrorOrSuccess<null> {
    return successResponse(null);
  }
  validateCredentialRequest(): ErrorOrSuccess<null> {
    return successResponse(null);
  }
  getClientCredentialsById(): ErrorOrSuccess<IClientCredentials> {
    return errorResponse("No credentials found");
  }
}

class MockPassingClientCredentialsService implements IClientCredentialsService {
  validateTokenRequest(): ErrorOrSuccess<null> {
    return successResponse(null);
  }
  validateCredentialRequest(): ErrorOrSuccess<null> {
    return successResponse(null);
  }
  getClientCredentialsById(): ErrorOrSuccess<IClientCredentials> {
    return successResponse({
      client_id: "mockClientId",
      issuer: "mockIssuer",
      salt: "mockSalt",
      hashed_client_secret: "mockHashedClientSecret",
    });
  }
}

class MockFailingClientCredentialsService implements IClientCredentialsService {
  validateTokenRequest(): ErrorOrSuccess<null> {
    return successResponse(null);
  }
  validateCredentialRequest(): ErrorOrSuccess<null> {
    return errorResponse("mockClientCredentialServiceError");
  }
  getClientCredentialsById(): ErrorOrSuccess<IClientCredentials> {
    return successResponse({
      client_id: "mockClientId",
      issuer: "mockIssuer",
      salt: "mockSalt",
      hashed_client_secret: "mockHashedClientSecret",
    });
  }
}

class MockPassingSsmService implements IGetClientCredentials {
  getClientCredentials = async (
    clientCredentials: IClientCredentials[] = [
      {
        client_id: "mockClientId",
        issuer: "mockIssuer",
        salt: "mockSalt",
        hashed_client_secret: "mockHashedClientSecret",
      },
    ],
  ): Promise<ErrorOrSuccess<IClientCredentials[]>> => {
    return Promise.resolve(successResponse(clientCredentials));
  };
}

class MockFailingSsmService implements IGetClientCredentials {
  getClientCredentials = async (): Promise<
    ErrorOrSuccess<IClientCredentials[]>
  > => {
    return errorResponse("Mock Failing SSM log");
  };
}

class MockFailingRecoverSessionService implements IRecoverAuthSession {
  readonly tableName: string;
  readonly indexName: string;

  constructor(tableName: string, indexName: string) {
    this.tableName = tableName;
    this.indexName = indexName;
  }

  getAuthSessionBySub = async (): Promise<ErrorOrSuccess<string | null>> => {
    return errorResponse("Mock failing DB call");
  };
}

class MockNoRecoverableSessionRecoverSessionService
  implements IRecoverAuthSession
{
  readonly tableName: string;
  readonly indexName: string;

  constructor(tableName: string, indexName: string) {
    this.tableName = tableName;
    this.indexName = indexName;
  }
  getAuthSessionBySub = async (): Promise<ErrorOrSuccess<string | null>> => {
    return successResponse(null);
  };
}

class MockSessionRecoveredRecoverSessionService implements IRecoverAuthSession {
  readonly tableName: string;
  readonly indexName: string;

  constructor(tableName: string, indexName: string) {
    this.tableName = tableName;
    this.indexName = indexName;
  }

  getAuthSessionBySub = async (): Promise<ErrorOrSuccess<string | null>> => {
    return successResponse("mockAuthSessionId");
  };
}
