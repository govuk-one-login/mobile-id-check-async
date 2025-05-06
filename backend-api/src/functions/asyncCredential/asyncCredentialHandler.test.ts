import { expect } from "@jest/globals";
import "../../../tests/testUtils/matchers";
import { APIGatewayProxyResult, Context } from "aws-lambda";
import {
  MockEventServiceFailToWrite,
  MockEventWriterSuccess,
} from "../services/events/tests/mocks";
import { MockJWTBuilder } from "../testUtils/mockJwtBuilder";
import { buildRequest } from "../testUtils/mockRequest";
import { Result, successResult } from "../utils/result";
import { lambdaHandlerConstructor } from "./asyncCredentialHandler";
import { IAsyncCredentialDependencies } from "./handlerDependencies";
import {
  IDecodedToken,
  IDecodeToken,
  IVerifyTokenSignature,
} from "./tokenService/tokenService";
import {
  MockTokenServiceErrorResult,
  MockTokenServiceGetDecodedTokenErrorResult,
  MockTokenServiceSuccess,
} from "./tokenService/tests/mocks";
import {
  MockClientRegistryServiceeGetPartialClientInternalServerResult,
  MockClientRegistryServiceGetPartialClientBadRequestResponse,
  MockClientRegistryServiceGetPartialClientSuccessResult,
} from "../services/clientRegistryService/tests/mocks";
import {
  MockSessionServiceCreateErrorResult,
  MockSessionServiceCreateSuccessResult,
  MockSessionServiceGetErrorResult,
  MockSessionServiceGetSuccessResult,
} from "../services/session/tests/mocks";
import { buildLambdaContext } from "../testUtils/mockContext";
import { logger } from "../common/logging/logger";

const env = {
  SIGNING_KEY_ID: "mockKid",
  ISSUER: "mockIssuer",
  SESSION_TABLE_NAME: "mockTableName",
  SESSION_DURATION_IN_SECONDS: "12345",
  TXMA_SQS: "mockSqsQueue",
  CLIENT_REGISTRY_SECRET_NAME: "mockParmaterName",
};

jest.mock("crypto", () => ({
  ...jest.requireActual("crypto"),
  randomUUID: () => "mockSessionId",
}));

describe("Async Credential", () => {
  let dependencies: IAsyncCredentialDependencies;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let context: Context;

  beforeEach(() => {
    consoleInfoSpy = jest.spyOn(console, "info");
    consoleErrorSpy = jest.spyOn(console, "error");
    dependencies = {
      eventService: () => new MockEventWriterSuccess(),
      tokenService: () => new MockTokenServiceSuccess(),
      clientRegistryService: () =>
        new MockClientRegistryServiceGetPartialClientSuccessResult(),
      sessionService: () => new MockSessionServiceGetSuccessResult(),
      env,
    };
    context = buildLambdaContext();
  });

  describe("On every invocation", () => {
    beforeEach(async () => {
      logger.appendKeys({ testKey: "testValue" });
      const event = buildRequest();
      await lambdaHandlerConstructor(dependencies, event, context);
    });

    it("Adds context and version to log attributes and logs STARTED message", () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_CREDENTIAL_STARTED",
        functionVersion: "1",
        function_arn: "arn:12345", // example field to verify that context has been added
      });
    });

    it("Clears pre-existing log attributes", async () => {
      expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
        testKey: "testValue",
      });
    });
  });

  describe("Environment variable validation", () => {
    describe.each(Object.keys(env))("Given %s is missing", (envVar: string) => {
      it("Returns a 500 Server Error response", async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        delete dependencies.env[envVar];
        const event = buildRequest();

        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          context,
        );

        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_CREDENTIAL_INVALID_CONFIG",
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

    describe("Given SESSION_DURATION_IN_SECONDS value is not a number", () => {
      it("Returns a 500 Server Error response", async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        dependencies.env["SESSION_DURATION_IN_SECONDS"] =
          "mockInvalidSessionTtlSecs";
        const event = buildRequest();

        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          context,
        );

        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_CREDENTIAL_INVALID_CONFIG",
          errorMessage: "SESSION_DURATION_IN_SECONDS is not a valid number",
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

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
          context,
        );

        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_CREDENTIAL_AUTHORIZATION_HEADER_INVALID",
          errorMessage: "No authorization header present",
        });

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 401,
          body: JSON.stringify({
            error: "invalid_token",
            error_description: "Invalid or missing authorization header",
          }),
        });
      });
    });

    describe("Given access token does not start with Bearer", () => {
      it("Returns 401 Unauthorized", async () => {
        const event = buildRequest({
          headers: { Authorization: "noBearerString mockToken" },
        });

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
          context,
        );

        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_CREDENTIAL_AUTHORIZATION_HEADER_INVALID",
          errorMessage:
            "Invalid authorization header format - does not start with Bearer",
        });

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 401,
          body: JSON.stringify({
            error: "invalid_token",
            error_description: "Invalid or missing authorization header",
          }),
        });
      });
    });

    describe("Given Bearer token is not in expected format - contains spaces", () => {
      it("Returns 401 Unauthorized", async () => {
        const event = buildRequest({
          headers: { Authorization: "Bearer mock token" },
        });

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
          context,
        );

        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_CREDENTIAL_AUTHORIZATION_HEADER_INVALID",
          errorMessage: "Invalid authorization header format - contains spaces",
        });

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 401,
          body: JSON.stringify({
            error: "invalid_token",
            error_description: "Invalid or missing authorization header",
          }),
        });
      });
    });

    describe("Given Bearer token is not in expected format - missing token", () => {
      it("Returns 401 Unauthorized", async () => {
        const event = buildRequest({
          headers: { Authorization: "Bearer " },
        });

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
          context,
        );

        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_CREDENTIAL_AUTHORIZATION_HEADER_INVALID",
          errorMessage: "Invalid authorization header format - missing token",
        });

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 401,
          body: JSON.stringify({
            error: "invalid_token",
            error_description: "Invalid or missing authorization header",
          }),
        });
      });
    });
  });

  describe("Get decoded token", () => {
    describe("Given decoding token fails", () => {
      it("Logs and returns 400 Bad Request response", async () => {
        const jwtBuilder = new MockJWTBuilder();
        const event = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
        });
        dependencies.tokenService = () =>
          new MockTokenServiceGetDecodedTokenErrorResult();

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
          context,
        );

        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_CREDENTIAL_INVALID_CLAIMS_IN_AUTHORIZATION_JWT",
          errorMessage: "Mock decoding token error",
        });

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_token",
            error_description: "Mock decoding token error",
          }),
        });
      });
    });
  });

  describe("Get request body", () => {
    describe("Given body is missing", () => {
      it("Returns 400 status code with invalid_request error", async () => {
        const jwtBuilder = new MockJWTBuilder();
        const event = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
          body: undefined,
        });
        dependencies.tokenService = () => new MockTokenServiceSuccess();

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
          context,
        );

        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_CREDENTIAL_REQUEST_BODY_INVALID",
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
          dependencies.tokenService = () => new MockTokenServiceSuccess();

          const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
            dependencies,
            event,
            context,
          );

          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_CREDENTIAL_REQUEST_BODY_INVALID",
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
        dependencies.tokenService = () => new MockTokenServiceSuccess();

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
          context,
        );

        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_CREDENTIAL_REQUEST_BODY_INVALID",
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
        dependencies.tokenService = () => new MockTokenServiceSuccess();

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
          context,
        );

        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_CREDENTIAL_REQUEST_BODY_INVALID",
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
        dependencies.tokenService = () => new MockTokenServiceSuccess();

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
          context,
        );

        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_CREDENTIAL_REQUEST_BODY_INVALID",
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
        dependencies.tokenService = () => new MockTokenServiceSuccess();

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
          context,
        );

        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_CREDENTIAL_REQUEST_BODY_INVALID",
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
        dependencies.tokenService = () => new MockTokenServiceSuccess();

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
          context,
        );

        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_CREDENTIAL_REQUEST_BODY_INVALID",
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
        dependencies.tokenService = () => new MockTokenServiceSuccess();

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
          context,
        );

        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_CREDENTIAL_REQUEST_BODY_INVALID",
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

  describe("JWT signature verification", () => {
    describe("Given that the JWT signature verification fails", () => {
      it("Returns 400 Bad Request", async () => {
        dependencies.tokenService = () => new MockTokenServiceErrorResult();
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

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
          context,
        );

        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_CREDENTIAL_FAILED_TO_VALIDATE_TOKEN_SIGNATURE",
          errorMessage: "Some error",
        });

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "Invalid signature",
          }),
        });
      });
    });
  });

  describe("Client Credentials Service", () => {
    describe("Get partial client credentials by client id", () => {
      describe("Given an error result is returned", () => {
        it("Returns a 500 Server Error response", async () => {
          dependencies.clientRegistryService = () =>
            new MockClientRegistryServiceeGetPartialClientInternalServerResult();
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

          const result = await lambdaHandlerConstructor(
            dependencies,
            event,
            context,
          );

          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_GET_CLIENT_REGISTRY_FAILURE",
            errorMessage: "Unexpected error retrieving registered client",
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

    describe("Redirect uri and issuer validation", () => {
      describe("Given redirect_uri does not match registered value", () => {
        it("Returns a 400 Bad request response", async () => {
          const jwtBuilder = new MockJWTBuilder();
          const event = buildRequest({
            headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
            body: JSON.stringify({
              state: "mockState",
              sub: "mockSub",
              client_id: "mockClientId",
              govuk_signin_journey_id: "mockGovukSigninJourneyId",
              redirect_uri: "https://www.unregisteredRedirectUri.com",
            }),
          });
          const result = await lambdaHandlerConstructor(
            dependencies,
            event,
            context,
          );

          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_CREDENTIAL_REQUEST_BODY_INVALID",
            errorMessage:
              "redirect_uri does not match value from client registry",
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

      describe("Given issuer does not match registered value", () => {
        it("Returns a 400 Bad request response", async () => {
          const jwtBuilder = new MockJWTBuilder();
          const event = buildRequest({
            headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
            body: JSON.stringify({
              state: "mockState",
              sub: "mockSub",
              client_id: "mockClientId",
              govuk_signin_journey_id: "mockGovukSigninJourneyId",
              redirect_uri: "https://www.unregisteredRedirectUri.com",
            }),
          });
          class MockTokenServiceInvalidIssuer
            implements IDecodeToken, IVerifyTokenSignature
          {
            getDecodedToken(): Result<IDecodedToken> {
              return successResult({
                encodedJwt:
                  "eyJhbGciOiJIUzI1NiIsInR5cGUiOiJKV1QifQ.eyJleHAiOjE3MjE5MDExNDMwMDAsImlzcyI6Im1vY2tJc3N1ZXIiLCJhdWQiOiJtb2NrSXNzdWVyIiwic2NvcGUiOiJkY21hdy5zZXNzaW9uLmFzeW5jX2NyZWF0ZSIsImNsaWVudF9pZCI6Im1vY2tDbGllbnRJZCJ9.Ik_kbkTVKzlXadti994bAtiHaFO1KsD4_yJGt4wpjr8",
                jwtPayload: {
                  aud: "mockIssuer",
                  client_id: "mockClientId",
                  exp: 1721901143000,
                  iss: "invalidIssuer",
                  scope: "dcmaw.session.async_create",
                },
              });
            }
            verifyTokenSignature(): Promise<Result<null>> {
              return Promise.resolve(successResult(null));
            }
          }
          dependencies.tokenService = () => new MockTokenServiceInvalidIssuer();

          const result = await lambdaHandlerConstructor(
            dependencies,
            event,
            context,
          );

          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_CREDENTIAL_REQUEST_BODY_INVALID",
            errorMessage: "issuer does not match value from client registry",
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
  });

  describe("Given client is not registered", () => {
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
      dependencies.clientRegistryService = () =>
        new MockClientRegistryServiceGetPartialClientBadRequestResponse();

      const result = await lambdaHandlerConstructor(
        dependencies,
        event,
        context,
      );

      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_CLIENT_NOT_FOUND_IN_REGISTRY",
        errorMessage: "Client Id is not registered",
      });

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

  describe("Session Service", () => {
    describe("Get an active session", () => {
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
            new MockSessionServiceGetErrorResult();

          const result = await lambdaHandlerConstructor(
            dependencies,
            event,
            context,
          );

          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_GET_ACTIVE_SESSION_FAILURE",
            errorMessage: "Mock error when getting session ID",
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
        it("Returns 200 OK", async () => {
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

          const result = await lambdaHandlerConstructor(
            dependencies,
            event,
            context,
          );

          expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_CREDENTIAL_COMPLETED",
          });

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

    describe("Create a session", () => {
      describe("Given there is an error creating a session", () => {
        it("Returns 500 Server Error", async () => {
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
            new MockSessionServiceCreateErrorResult();

          const result = await lambdaHandlerConstructor(
            dependencies,
            event,
            context,
          );

          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_CREATE_SESSION_FAILURE",
            errorMessage: "Mock error when creating session",
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

      describe("Given a session has been created", () => {
        describe("Given it fails to write the DCMAW_ASYNC_CRI_START event to TxMA", () => {
          it("Returns 500 Server Error", async () => {
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
              new MockSessionServiceCreateSuccessResult();

            const result = await lambdaHandlerConstructor(
              dependencies,
              event,
              context,
            );

            expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
              messageCode: "MOBILE_ASYNC_ERROR_WRITING_AUDIT_EVENT",
              data: {
                auditEventName: "DCMAW_ASYNC_CRI_START",
              },
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

        describe("Given it successfully writes the DCMAW_ASYNC_CRI_START event to TxMA", () => {
          it("Returns 201 Created", async () => {
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
                redirect_uri: "https://www.mockUrl.com",
              }),
            });
            const mockEventService = new MockEventWriterSuccess();
            dependencies.eventService = () => mockEventService;
            dependencies.sessionService = () =>
              new MockSessionServiceCreateSuccessResult();

            const result = await lambdaHandlerConstructor(
              dependencies,
              event,
              context,
            );

            expect(mockEventService.auditEvents[0]).toEqual(
              "DCMAW_ASYNC_CRI_START",
            );

            expect(mockEventService.eventConfig).toEqual(
              expect.objectContaining({
                eventName: "DCMAW_ASYNC_CRI_START",
                componentId: "mockIssuer",
                getNowInMilliseconds: Date.now,
                govukSigninJourneyId: "mockGovukSigninJourneyId",
                sub: "mockSub",
                sessionId: "mockSessionId",
                ipAddress: undefined,
                redirect_uri: "https://www.mockUrl.com",
                suspected_fraud_signal: undefined,
                txmaAuditEncoded: undefined,
              }),
            );

            expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
              messageCode: "MOBILE_ASYNC_CREDENTIAL_COMPLETED",
            });

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
