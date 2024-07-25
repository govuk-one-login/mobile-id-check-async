import { APIGatewayProxyResult } from "aws-lambda";
import { buildRequest } from "../testUtils/mockRequest";
import {
  IDecodedToken,
  IDecodeToken,
  IVerifyTokenSignature,
} from "./TokenService/tokenService";
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
import { MockJWTBuilder } from "../testUtils/mockJwt";
import { Logger } from "../services/logging/logger";
import { MessageName, registeredLogs } from "./registeredLogs";
import { MockLoggingAdapter } from "../services/logging/tests/mockLogger";
import {
  ICreateSession,
  IGetActiveSession,
} from "./sessionService/sessionService";
import {
  MockEventServiceFailToWrite,
  MockEventWriterSuccess,
} from "../services/events/tests/mocks";

const env = {
  SIGNING_KEY_ID: "mockKid",
  ISSUER: "mockIssuer",
  SESSION_TABLE_NAME: "mockTableName",
  SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME: "mockIndexName",
  SESSION_TTL_IN_MILLISECONDS: "12345",
  SQS_QUEUE: "mockSqsQueue",
};

describe("Async Credential", () => {
  let dependencies: Dependencies;
  let mockLogger: MockLoggingAdapter<MessageName>;

  beforeEach(() => {
    mockLogger = new MockLoggingAdapter();
    dependencies = {
      eventService: () => new MockEventWriterSuccess(),
      logger: () => new Logger(mockLogger, registeredLogs),
      tokenService: () => new MockTokenServiceValidClaim(),
      ssmService: () => new MockPassingSsmService(),
      clientCredentialsService: () => new MockPassingClientCredentialsService(),
      sessionService: () =>
        new MockSessionServiceNoActiveSession(
          env.SESSION_TABLE_NAME,
          env.SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME,
        ),
      env,
    };
  });

  describe("Environment variable validation", () => {
    describe.each(Object.keys(env))("Given %s is missing", (envVar: string) => {
      it("Returns a 500 Server Error response", async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        delete dependencies.env[envVar];
        const event = buildRequest();
        const result = await lambdaHandler(event, dependencies);

        expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
          "ENVIRONMENT_VARIABLE_MISSING",
        );
        expect(mockLogger.getLogMessages()[0].data).toStrictEqual({
          errorMessage: `No ${envVar}`,
        });

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

    describe("Given SESSION_TTL_IN_MILLISECONDS value is not a number", () => {
      it("Returns a 500 Server Error response", async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        dependencies.env["SESSION_TTL_IN_MILLISECONDS"] =
          "mockInvalidSessionTtlMs";
        const event = buildRequest();
        const result = await lambdaHandler(event, dependencies);

        expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
          "ENVIRONMENT_VARIABLE_MISSING",
        );
        expect(mockLogger.getLogMessages()[0].data).toStrictEqual({
          errorMessage: "SESSION_TTL_IN_MILLISECONDS is not a valid number",
        });

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

        expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
          "AUTHENTICATION_HEADER_INVALID",
        );
        expect(mockLogger.getLogMessages()[0].data).toStrictEqual({
          errorMessage: "No Authentication header present",
        });

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

        expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
          "AUTHENTICATION_HEADER_INVALID",
        );
        expect(mockLogger.getLogMessages()[0].data).toStrictEqual({
          errorMessage:
            "Invalid authentication header format - does not start with Bearer",
        });

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

        expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
          "AUTHENTICATION_HEADER_INVALID",
        );
        expect(mockLogger.getLogMessages()[0].data).toStrictEqual({
          errorMessage:
            "Invalid authentication header format - contains spaces",
        });

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

        expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
          "AUTHENTICATION_HEADER_INVALID",
        );
        expect(mockLogger.getLogMessages()[0].data).toStrictEqual({
          errorMessage: "Invalid authentication header format - missing token",
        });

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

  describe("Token claim validation", () => {
    describe("Given there is an invalid claim", () => {
      it("Returns a log", async () => {
        const jwtBuilder = new MockJWTBuilder();
        jwtBuilder.deleteExp();
        const event = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
        });

        dependencies.tokenService = () => new MockTokenServiceInvalidClaim();

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );

        expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
          "JWT_CLAIM_INVALID",
        );
        expect(mockLogger.getLogMessages()[0].data).toStrictEqual({
          errorMessage: "Mock invalid claim",
        });

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_token",
            error_description: "Mock invalid claim",
          }),
        });
      });
    });

    describe("Given claims are valid", () => {
      it("returns success response with encodedJWT and jwtPayload", async () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date(1721901142000)); // Thursday, 25 July 2024 10:52:22 GMT+01:00
        const jwtBuilder = new MockJWTBuilder();
        const event = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
        });
        const mockTokenService = new MockTokenServiceValidClaim();
        dependencies.tokenService = () => mockTokenService;

        await lambdaHandler(event, dependencies);

        expect(mockTokenService.tokenObjects[0]).toEqual({
          encodedJwt:
            "eyJhbGciOiJIUzI1NiIsInR5cGUiOiJKV1QifQ.eyJleHAiOjE3MjE5MDExNDMwMDAsImlzcyI6Im1vY2tJc3N1ZXIiLCJhdWQiOiJtb2NrSXNzdWVyIiwic2NvcGUiOiJkY21hdy5zZXNzaW9uLmFzeW5jX2NyZWF0ZSIsImNsaWVudF9pZCI6Im1vY2tDbGllbnRJZCJ9.Ik_kbkTVKzlXadti994bAtiHaFO1KsD4_yJGt4wpjr8",
          jwtPayload: {
            aud: "mockIssuer",
            client_id: "mockClientId",
            exp: 1721901143000,
            iss: "mockIssuer",
            scope: "dcmaw.session.async_create",
          },
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

        dependencies.tokenService = () => new MockTokenServiceValidSignature();

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );

        expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
          "REQUEST_BODY_INVALID",
        );
        expect(mockLogger.getLogMessages()[0].data).toStrictEqual({
          errorMessage: "Missing request body",
        });

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "Request body validation failed",
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
      it.each(invalidJsonCases)(
        "Returns 400 status code with invalid_request error when body is %s",
        async (_description, invalidJson) => {
          const jwtBuilder = new MockJWTBuilder();
          const event = buildRequest({
            headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
            body: invalidJson,
          });

          dependencies.tokenService = () =>
            new MockTokenServiceValidSignature();

          const result: APIGatewayProxyResult = await lambdaHandler(
            event,
            dependencies,
          );

          expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
            "REQUEST_BODY_INVALID",
          );
          expect(mockLogger.getLogMessages()[0].data).toStrictEqual({
            errorMessage: "Invalid JSON in request body",
          });

          expect(result).toStrictEqual({
            headers: { "Content-Type": "application/json" },
            statusCode: 400,
            body: JSON.stringify({
              error: "invalid_request",
              error_description: "Request body validation failed",
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

        dependencies.tokenService = () => new MockTokenServiceValidSignature();

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );

        expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
          "REQUEST_BODY_INVALID",
        );
        expect(mockLogger.getLogMessages()[0].data).toStrictEqual({
          errorMessage: "Missing state in request body",
        });

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "Request body validation failed",
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

        dependencies.tokenService = () => new MockTokenServiceValidSignature();

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );

        expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
          "REQUEST_BODY_INVALID",
        );
        expect(mockLogger.getLogMessages()[0].data).toStrictEqual({
          errorMessage: "Missing sub in request body",
        });

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "Request body validation failed",
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

        dependencies.tokenService = () => new MockTokenServiceValidSignature();

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );

        expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
          "REQUEST_BODY_INVALID",
        );
        expect(mockLogger.getLogMessages()[0].data).toStrictEqual({
          errorMessage: "Missing client_id in request body",
        });

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "Request body validation failed",
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

        dependencies.tokenService = () => new MockTokenServiceValidSignature();

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );

        expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
          "REQUEST_BODY_INVALID",
        );
        expect(mockLogger.getLogMessages()[0].data).toStrictEqual({
          errorMessage:
            "client_id in request body does not match value in access_token",
        });

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "Request body validation failed",
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

        dependencies.tokenService = () => new MockTokenServiceValidSignature();

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );

        expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
          "REQUEST_BODY_INVALID",
        );
        expect(mockLogger.getLogMessages()[0].data).toStrictEqual({
          errorMessage: "Missing govuk_signin_journey_id in request body",
        });

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "Request body validation failed",
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

        dependencies.tokenService = () => new MockTokenServiceValidSignature();

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );

        expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
          "REQUEST_BODY_INVALID",
        );
        expect(mockLogger.getLogMessages()[0].data).toStrictEqual({
          errorMessage: "redirect_uri in request body is not a URL",
        });

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "Request body validation failed",
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
        dependencies.tokenService = () =>
          new MockTokenServiceInvalidSignature();

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

        expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
          "TOKEN_SIGNATURE_INVALID",
        );
        expect(mockLogger.getLogMessages()[0].data.errorMessage).toBe(
          "Failed to verify token signature",
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

        expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
          "ERROR_RETRIEVING_CLIENT_CREDENTIALS",
        );
        expect(mockLogger.getLogMessages()[0].data.errorMessage).toBe(
          "Mock Failing SSM log",
        );
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

  describe("Client Credentials Service", () => {
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

        expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
          "CLIENT_CREDENTIALS_INVALID",
        );
        expect(mockLogger.getLogMessages()[0].data.errorMessage).toBe(
          "No credentials found",
        );
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

    describe("Given redirect_uri is not valid", () => {
      it("Returns a 400 Bad request response", async () => {
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
          new MockClientCredentialsServiceInvalidRedirectUri();

        const result = await lambdaHandler(event, dependencies);

        expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
          "REQUEST_BODY_INVALID",
        );
        expect(mockLogger.getLogMessages()[0].data.errorMessage).toBe(
          "Invalid redirect_uri",
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

  describe("Aud claim validation", () => {
    describe("aud claim from JWT payload does not match registered issuer for given client", () => {
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

        expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
          "JWT_CLAIM_INVALID",
        );
        expect(mockLogger.getLogMessages()[0].data.errorMessage).toBe(
          "Invalid aud claim",
        );
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

  describe("Session Service", () => {
    describe("Check for active session", () => {
      describe("Given there is an error checking for an existing session", () => {
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
          dependencies.sessionService = () =>
            new MockSessionServiceGetSessionBySubFailure(
              env.SESSION_TABLE_NAME,
              env.SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME,
            );

          const result = await lambdaHandler(event, dependencies);

          expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
            "ERROR_RETRIEVING_SESSION",
          );
          expect(mockLogger.getLogMessages()[0].data).toStrictEqual({
            errorMessage: "Unexpected error checking for existing session",
          });

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

      describe("Given there is an active session", () => {
        it("Logs and returns 200 active session found response", async () => {
          const jwtBuilder = new MockJWTBuilder();
          const event = buildRequest({
            headers: {
              Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}`,
            },
            body: JSON.stringify({
              state: "mockState",
              sub: "mockSub",
              client_id: "mockClientId",
              govuk_signin_journey_id: "mockGovukSigninJourneyId",
            }),
          });
          dependencies.sessionService = () =>
            new MockSessionServiceActiveSessionFound(
              env.SESSION_TABLE_NAME,
              env.SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME,
            );

          const result = await lambdaHandler(event, dependencies);

          expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
            "COMPLETED",
          );

          expect(mockLogger.getLogMessages()[0].logMessage.sessionId).toBe(
            "mockSessionId",
          );

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
    });

    describe("Session creation", () => {
      describe("Given there is an error creating the session", () => {
        it("Logs and returns a 500 Internal Server Error", async () => {
          const jwtBuilder = new MockJWTBuilder();
          const event = buildRequest({
            headers: {
              Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}`,
            },
            body: JSON.stringify({
              state: "mockState",
              sub: "mockSub",
              client_id: "mockClientId",
              govuk_signin_journey_id: "mockGovukSigninJourneyId",
            }),
          });
          dependencies.sessionService = () =>
            new MockSessionServiceFailToCreateSession(
              env.SESSION_TABLE_NAME,
              env.SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME,
            );

          const result = await lambdaHandler(event, dependencies);

          expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
            "ERROR_CREATING_SESSION",
          );
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

      describe("Given the session has been created", () => {
        describe("Given it fails to write the DCMAW_ASYNC_CRI_START event to TxMA", () => {
          it("Logs and returns 201 session created response", async () => {
            const jwtBuilder = new MockJWTBuilder();
            const event = buildRequest({
              headers: {
                Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}`,
              },
              body: JSON.stringify({
                state: "mockState",
                sub: "mockSub",
                client_id: "mockClientId",
                govuk_signin_journey_id: "mockGovukSigninJourneyId",
              }),
            });
            dependencies.eventService = () =>
              new MockEventServiceFailToWrite("DCMAW_ASYNC_CRI_START");
            dependencies.sessionService = () =>
              new MockSessionServiceSessionCreated(
                env.SESSION_TABLE_NAME,
                env.SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME,
              );

            const result = await lambdaHandler(event, dependencies);

            expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
              "ERROR_WRITING_AUDIT_EVENT",
            );
            expect(mockLogger.getLogMessages()[0].data.errorMessage).toBe(
              "Unexpected error writing the DCMAW_ASYNC_CRI_START event",
            );

            expect(result).toStrictEqual({
              headers: { "Content-Type": "application/json" },
              statusCode: 201,
              body: JSON.stringify({
                sub: "mockSub",
                "https://vocab.account.gov.uk/v1/credentialStatus": "pending",
              }),
            });
          });
        });

        describe("Given it successfully writes the DCMAW_ASYNC_CRI_START event to TxMA", () => {
          it("Logs and returns 201 session created response", async () => {
            const jwtBuilder = new MockJWTBuilder();
            const event = buildRequest({
              headers: {
                Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}`,
              },
              body: JSON.stringify({
                state: "mockState",
                sub: "mockSub",
                client_id: "mockClientId",
                govuk_signin_journey_id: "mockGovukSigninJourneyId",
              }),
            });

            const mockEventService = new MockEventWriterSuccess();
            dependencies.eventService = () => mockEventService;
            dependencies.sessionService = () =>
              new MockSessionServiceSessionCreated(
                env.SESSION_TABLE_NAME,
                env.SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME,
              );

            const result = await lambdaHandler(event, dependencies);

            expect(mockEventService.auditEvents[0]).toEqual(
              "DCMAW_ASYNC_CRI_START",
            );

            expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
              "COMPLETED",
            );

            expect(mockLogger.getLogMessages()[0].logMessage.sessionId).toEqual(
              expect.any(String),
            );

            expect(result).toStrictEqual({
              headers: { "Content-Type": "application/json" },
              statusCode: 201,
              body: JSON.stringify({
                sub: "mockSub",
                "https://vocab.account.gov.uk/v1/credentialStatus": "pending",
              }),
            });
          });
        });
      });
    });
  });
});

class MockTokenServiceInvalidClaim
  implements IDecodeToken, IVerifyTokenSignature
{
  getDecodedToken(): ErrorOrSuccess<IDecodedToken> {
    return errorResponse("Mock invalid claim");
  }
  verifyTokenSignature(): Promise<ErrorOrSuccess<null>> {
    return Promise.resolve(successResponse(null));
  }
}

class MockTokenServiceValidClaim
  implements IDecodeToken, IVerifyTokenSignature
{
  getDecodedToken(authorizationHeader: string): ErrorOrSuccess<IDecodedToken> {
    const encodedJwt = authorizationHeader.split(" ")[1];
    const payload = encodedJwt.split(".")[1];
    const jwtPayload = JSON.parse(
      Buffer.from(payload, "base64").toString("utf-8"),
    );

    return successResponse({
      encodedJwt,
      jwtPayload,
    });
  }
  verifyTokenSignature(): Promise<ErrorOrSuccess<null>> {
    return Promise.resolve(successResponse(null));
  }
}

class MockTokenServiceInvalidSignature
  implements IDecodeToken, IVerifyTokenSignature
{
  getDecodedToken(): ErrorOrSuccess<IDecodedToken> {
    return successResponse({
      encodedJwt:
        "eyJhbGciOiJIUzI1NiIsInR5cGUiOiJKV1QifQ.eyJleHAiOjE3MjE5MDExNDMwMDAsImlzcyI6Im1vY2tJc3N1ZXIiLCJhdWQiOiJtb2NrSXNzdWVyIiwic2NvcGUiOiJkY21hdy5zZXNzaW9uLmFzeW5jX2NyZWF0ZSIsImNsaWVudF9pZCI6Im1vY2tDbGllbnRJZCJ9.Ik_kbkTVKzlXadti994bAtiHaFO1KsD4_yJGt4wpjr8",
      jwtPayload: {
        aud: "mockIssuer",
        client_id: "mockClientId",
        exp: 1721901143000,
        iss: "mockIssuer",
        scope: "dcmaw.session.async_create",
      },
    });
  }
  verifyTokenSignature(): Promise<ErrorOrSuccess<null>> {
    return Promise.resolve(errorResponse("Failed to verify token signature"));
  }
}

class MockTokenServiceValidSignature
  implements IDecodeToken, IVerifyTokenSignature
{
  getDecodedToken(): ErrorOrSuccess<IDecodedToken> {
    return successResponse({
      encodedJwt:
        "eyJhbGciOiJIUzI1NiIsInR5cGUiOiJKV1QifQ.eyJleHAiOjE3MjE5MDExNDMwMDAsImlzcyI6Im1vY2tJc3N1ZXIiLCJhdWQiOiJtb2NrSXNzdWVyIiwic2NvcGUiOiJkY21hdy5zZXNzaW9uLmFzeW5jX2NyZWF0ZSIsImNsaWVudF9pZCI6Im1vY2tDbGllbnRJZCJ9.Ik_kbkTVKzlXadti994bAtiHaFO1KsD4_yJGt4wpjr8",
      jwtPayload: {
        aud: "mockIssuer",
        client_id: "mockClientId",
        exp: 1721901143000,
        iss: "mockIssuer",
        scope: "dcmaw.session.async_create",
      },
    });
  }
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
  validateRedirectUri(): ErrorOrSuccess<null> {
    return successResponse(null);
  }
  getClientCredentialsById(): ErrorOrSuccess<IClientCredentials> {
    return errorResponse("No credentials found");
  }
}

class MockFailingClientCredentialsService implements IClientCredentialsService {
  validateTokenRequest(): ErrorOrSuccess<null> {
    return successResponse(null);
  }
  validateRedirectUri(): ErrorOrSuccess<null> {
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

class MockClientCredentialsServiceInvalidRedirectUri
  implements IClientCredentialsService
{
  validateTokenRequest(): ErrorOrSuccess<null> {
    return successResponse(null);
  }
  validateRedirectUri(): ErrorOrSuccess<null> {
    return errorResponse("Invalid redirect_uri");
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

class MockPassingClientCredentialsService implements IClientCredentialsService {
  validateTokenRequest(): ErrorOrSuccess<null> {
    return successResponse(null);
  }
  validateRedirectUri(): ErrorOrSuccess<null> {
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

class MockSessionServiceGetSessionBySubFailure
  implements IGetActiveSession, ICreateSession
{
  readonly tableName: string;
  readonly indexName: string;

  constructor(tableName: string, indexName: string) {
    this.tableName = tableName;
    this.indexName = indexName;
  }

  getActiveSession = async (): Promise<ErrorOrSuccess<string | null>> => {
    return errorResponse("Mock failing DB call");
  };

  createSession = async (): Promise<ErrorOrSuccess<null>> => {
    return successResponse(null);
  };
}

class MockSessionServiceNoActiveSession
  implements IGetActiveSession, ICreateSession
{
  readonly tableName: string;
  readonly indexName: string;

  constructor(tableName: string, indexName: string) {
    this.tableName = tableName;
    this.indexName = indexName;
  }
  getActiveSession = async (): Promise<ErrorOrSuccess<string | null>> => {
    return successResponse(null);
  };

  createSession = async (): Promise<ErrorOrSuccess<null>> => {
    return successResponse(null);
  };
}

class MockSessionServiceActiveSessionFound
  implements IGetActiveSession, ICreateSession
{
  readonly tableName: string;
  readonly indexName: string;

  constructor(tableName: string, indexName: string) {
    this.tableName = tableName;
    this.indexName = indexName;
  }

  getActiveSession = async (): Promise<ErrorOrSuccess<string | null>> => {
    return successResponse("mockSessionId");
  };

  createSession = async (): Promise<ErrorOrSuccess<null>> => {
    return successResponse(null);
  };
}

class MockSessionServiceFailToCreateSession
  implements IGetActiveSession, ICreateSession
{
  readonly tableName: string;
  readonly indexName: string;

  constructor(tableName: string, indexName: string) {
    this.tableName = tableName;
    this.indexName = indexName;
  }

  getActiveSession = async (): Promise<ErrorOrSuccess<string | null>> => {
    return successResponse(null);
  };

  createSession = async (): Promise<ErrorOrSuccess<null>> => {
    return errorResponse("Mock error");
  };
}

class MockSessionServiceSessionCreated
  implements IGetActiveSession, ICreateSession
{
  readonly tableName: string;
  readonly indexName: string;

  constructor(tableName: string, indexName: string) {
    this.tableName = tableName;
    this.indexName = indexName;
  }

  getActiveSession = async (): Promise<ErrorOrSuccess<string | null>> => {
    return successResponse(null);
  };

  createSession = async (): Promise<ErrorOrSuccess<null>> => {
    return successResponse(null);
  };
}
