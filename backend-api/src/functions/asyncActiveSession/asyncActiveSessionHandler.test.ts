import { APIGatewayProxyResult } from "aws-lambda";
import { buildRequest } from "../testUtils/mockRequest";
import { lambdaHandlerConstructor } from "./asyncActiveSessionHandler";
import { IAsyncActiveSessionDependencies } from "./handlerDependencies";
import { MockLoggingAdapter } from "../services/logging/tests/mockLogger";
import { MessageName, registeredLogs } from "./registeredLogs";
import { Logger } from "../services/logging/logger";
import { MockJWTBuilder } from "../testUtils/mockJwtBuilder";
import {
  MockSessionServiceGetErrorResult,
  MockSessionServiceGetSuccessResult,
  MockSessionServiceGetNullSuccessResult,
} from "../services/session/tests/mocks";
import {
  MockJweDecrypterClientError,
  MockJweDecrypterServerError,
  MockJweDecrypterSuccess,
} from "./jwe/tests/mocks";
import {
  MockTokenServiceClientError,
  MockTokenServiceServerError,
  MockTokenServiceSuccess,
} from "./tokenService/tests/mocks";

const env = {
  ENCRYPTION_KEY_ARN: "mockEncryptionKeyArn",
  SESSION_TABLE_NAME: "mockSessionTableName",
  AUDIENCE: "https://mockAudience.com/",
  STS_BASE_URL: "https://mockUrl.com/",
};

describe("Async Active Session", () => {
  let dependencies: IAsyncActiveSessionDependencies;
  let mockLoggingAdapter: MockLoggingAdapter<MessageName>;

  beforeEach(() => {
    mockLoggingAdapter = new MockLoggingAdapter();
    dependencies = {
      env,
      logger: () => new Logger(mockLoggingAdapter, registeredLogs),
      jweDecrypter: () => new MockJweDecrypterSuccess(),
      tokenService: () => new MockTokenServiceSuccess(),
      sessionService: () => new MockSessionServiceGetSuccessResult(),
    };
  });

  describe("Environment variable validation", () => {
    describe.each(Object.keys(env))("Given %s is missing", (envVar: string) => {
      it("Returns a 500 Server Error response", async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        delete dependencies.env[envVar];
        const event = buildRequest();

        const result = await lambdaHandlerConstructor(dependencies, event);

        expect(mockLoggingAdapter.getLogMessages()[1].logMessage.message).toBe(
          "ENVIRONMENT_VARIABLE_MISSING",
        );
        expect(mockLoggingAdapter.getLogMessages()[1].data).toStrictEqual({
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

    describe("Given the STS_BASE_URL is not a URL", () => {
      it("Returns a 500 Server Error response", async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        dependencies.env["STS_BASE_URL"] = "mockInvalidSessionTtlSecs";
        const event = buildRequest();

        const result = await lambdaHandlerConstructor(dependencies, event);

        expect(mockLoggingAdapter.getLogMessages()[1].logMessage.message).toBe(
          "ENVIRONMENT_VARIABLE_MISSING",
        );
        expect(mockLoggingAdapter.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "STS_BASE_URL is not a URL",
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

  describe("Request Service", () => {
    describe("Given Authentication header is missing", () => {
      it("Returns 401 Unauthorized", async () => {
        const event = buildRequest();

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
        );

        expect(mockLoggingAdapter.getLogMessages()[1].logMessage.message).toBe(
          "AUTHENTICATION_HEADER_INVALID",
        );
        expect(mockLoggingAdapter.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "No Authentication header present",
        });
        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 401,
          body: JSON.stringify({
            error: "unauthorized",
            error_description: "Invalid authorization header",
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
        );

        expect(mockLoggingAdapter.getLogMessages()[1].logMessage.message).toBe(
          "AUTHENTICATION_HEADER_INVALID",
        );
        expect(mockLoggingAdapter.getLogMessages()[1].data).toStrictEqual({
          errorMessage:
            "Invalid authentication header format - does not start with Bearer",
        });
        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 401,
          body: JSON.stringify({
            error: "unauthorized",
            error_description: "Invalid authorization header",
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
        );

        expect(mockLoggingAdapter.getLogMessages()[1].logMessage.message).toBe(
          "AUTHENTICATION_HEADER_INVALID",
        );
        expect(mockLoggingAdapter.getLogMessages()[1].data).toStrictEqual({
          errorMessage:
            "Invalid authentication header format - contains spaces",
        });
        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 401,
          body: JSON.stringify({
            error: "unauthorized",
            error_description: "Invalid authorization header",
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
        );

        expect(mockLoggingAdapter.getLogMessages()[1].logMessage.message).toBe(
          "AUTHENTICATION_HEADER_INVALID",
        );
        expect(mockLoggingAdapter.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "Invalid authentication header format - missing token",
        });
        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 401,
          body: JSON.stringify({
            error: "unauthorized",
            error_description: "Invalid authorization header",
          }),
        });
      });
    });
  });

  describe("Decrypt JWE", () => {
    describe("Given decrypting the service token fails due to a server error", () => {
      it("Logs and returns 500 Server Error response", async () => {
        dependencies.jweDecrypter = () => new MockJweDecrypterServerError();

        const event = buildRequest({
          headers: {
            Authorization: "Bearer protectedHeader.encryptedKey.iv.ciphertext",
          },
        });

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
        );

        expect(mockLoggingAdapter.getLogMessages()[1].logMessage.message).toBe(
          "INTERNAL_SERVER_ERROR",
        );
        expect(mockLoggingAdapter.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "Some mock decryption server error",
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

    describe("Given decrypting the service token fails due to a client error", () => {
      it("Logs and returns 400 Bad Request response", async () => {
        dependencies.jweDecrypter = () => new MockJweDecrypterClientError();

        const event = buildRequest({
          headers: {
            Authorization: "Bearer protectedHeader.encryptedKey.iv.ciphertext",
          },
        });

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
        );

        expect(mockLoggingAdapter.getLogMessages()[1].logMessage.message).toBe(
          "JWE_DECRYPTION_ERROR",
        );
        expect(mockLoggingAdapter.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "Some mock decryption client error",
        });
        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "Failed to decrypt service token",
          }),
        });
      });
    });
  });

  describe("Token Service", () => {
    describe("Given the service token fails to validate due to an internal server error", () => {
      it("Logs and returns 500 Server Error response", async () => {
        const jwtBuilder = new MockJWTBuilder();
        const event = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
        });
        dependencies.tokenService = () => new MockTokenServiceServerError();
        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
        );

        expect(mockLoggingAdapter.getLogMessages()[1].logMessage.message).toBe(
          "INTERNAL_SERVER_ERROR",
        );
        expect(mockLoggingAdapter.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "Mock server error",
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

    describe("Given the service token fails to validate due to a client error", () => {
      it("Logs and returns 400 Bad Request response", async () => {
        const jwtBuilder = new MockJWTBuilder();
        const event = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
        });
        dependencies.tokenService = () => new MockTokenServiceClientError();
        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
        );

        expect(mockLoggingAdapter.getLogMessages()[1].logMessage.message).toBe(
          "SERVICE_TOKEN_VALIDATION_ERROR",
        );
        expect(mockLoggingAdapter.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "Mock client error",
        });
        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "Failed to validate service token",
          }),
        });
      });
    });
  });

  describe("Session Service", () => {
    describe("Given an error happens when trying to get an active session", () => {
      it("Returns 500 Server Error", async () => {
        const jwtBuilder = new MockJWTBuilder();
        const event = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
        });
        dependencies.sessionService = () =>
          new MockSessionServiceGetErrorResult();

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
        );

        expect(mockLoggingAdapter.getLogMessages()[1].logMessage.message).toBe(
          "INTERNAL_SERVER_ERROR",
        );
        expect(mockLoggingAdapter.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "Mock error when getting session details",
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

    describe("Given an active session is not found", () => {
      it("Returns 404 Not Found", async () => {
        const jwtBuilder = new MockJWTBuilder();
        const event = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
        });
        dependencies.sessionService = () =>
          new MockSessionServiceGetNullSuccessResult();

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
        );

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 404,
          body: JSON.stringify({
            error: "session_not_found",
            error_description:
              "No active session found for the given sub identifier",
          }),
        });
      });
    });

    describe("Given an active session is found", () => {
      it("Returns 200 and the session details", async () => {
        const jwtBuilder = new MockJWTBuilder();
        const event = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
        });
        dependencies.sessionService = () =>
          new MockSessionServiceGetSuccessResult();

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
        );

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 200,
          body: JSON.stringify({
            sessionId: "mockSessionId",
            redirectUri: "https://mockUrl.com/redirect",
            state: "mockClientState",
          }),
        });
      });
    });
  });
});
