import { APIGatewayProxyResult, Context } from "aws-lambda";
import { buildRequest } from "../testUtils/mockRequest";
import { lambdaHandlerConstructor } from "./asyncActiveSessionHandler";
import { IAsyncActiveSessionDependencies } from "./handlerDependencies";
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
import { buildLambdaContext } from "../testUtils/mockContext";
import { logger } from "../common/logging/logger";
import "../../../tests/testUtils/matchers";
import { expect } from "@jest/globals";

const env = {
  ENCRYPTION_KEY_ARN: "mockEncryptionKeyArn",
  SESSION_TABLE_NAME: "mockSessionTableName",
  AUDIENCE: "https://mockAudience.com/",
  STS_BASE_URL: "https://mockUrl.com/",
};

describe("Async Active Session", () => {
  let dependencies: IAsyncActiveSessionDependencies;
  let context: Context;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let result: APIGatewayProxyResult;

  const jwtBuilder = new MockJWTBuilder();
  const validRequest = buildRequest({
    headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
  });

  beforeEach(() => {
    dependencies = {
      env,
      jweDecrypter: () => new MockJweDecrypterSuccess(),
      tokenService: () => new MockTokenServiceSuccess(),
      sessionService: () => new MockSessionServiceGetSuccessResult(),
    };
    context = buildLambdaContext();
    consoleInfoSpy = jest.spyOn(console, "info");
    consoleErrorSpy = jest.spyOn(console, "error");
  });

  describe("On every invocation", () => {
    beforeEach(async () => {
      result = await lambdaHandlerConstructor(
        dependencies,
        validRequest,
        context,
      );
    });

    it("Adds context and version to log attributes and logs STARTED message", () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_ACTIVE_SESSION_STARTED",
        functionVersion: "1",
        function_arn: "arn:12345",
      });
    });

    it("Clears pre-existing log attributes", async () => {
      logger.appendKeys({ testKey: "testValue" });
      result = await lambdaHandlerConstructor(
        dependencies,
        validRequest,
        context,
      );

      expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
        testKey: "testValue",
      });
    });
  });

  describe("Environment variable validation", () => {
    describe.each(Object.keys(env))("Given %s is missing", (envVar: string) => {
      beforeEach(async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        delete dependencies.env[envVar];

        result = await lambdaHandlerConstructor(
          dependencies,
          validRequest,
          context,
        );
      });

      it("logs INVALID_CONFIG", async () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_ACTIVE_SESSION_INVALID_CONFIG",
          data: {
            missingEnvironmentVariables: [envVar],
          },
        });
      });

      it("Returns a 500 Server Error response", async () => {
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
      beforeEach(async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        dependencies.env["STS_BASE_URL"] = "mockInvalidUrl";

        result = await lambdaHandlerConstructor(
          dependencies,
          validRequest,
          context,
        );
      });

      it("logs INVALID_CONFIG", async () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_ACTIVE_SESSION_INVALID_CONFIG",
          errorMessage: "STS_BASE_URL is not a URL",
        });
      });

      it("Returns a 500 Server Error response", async () => {
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
      beforeEach(async () => {
        const request = buildRequest();

        result = await lambdaHandlerConstructor(dependencies, request, context);
      });

      it("Logs error", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ACTIVE_SESSION_AUTHORIZATION_HEADER_INVALID",
          errorMessage: "No authorization header present",
        });
      });

      it("Returns 401 Unauthorized", async () => {
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
      beforeEach(async () => {
        const request = buildRequest({
          headers: { Authorization: "noBearerString mockToken" },
        });

        result = await lambdaHandlerConstructor(dependencies, request, context);
      });

      it("Logs error", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ACTIVE_SESSION_AUTHORIZATION_HEADER_INVALID",
          errorMessage:
            "Invalid authorization header format - does not start with Bearer",
        });
      });

      it("Returns 401 Unauthorized", async () => {
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
      beforeEach(async () => {
        const request = buildRequest({
          headers: { Authorization: "Bearer mock token" },
        });

        result = await lambdaHandlerConstructor(dependencies, request, context);
      });

      it("Logs error", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ACTIVE_SESSION_AUTHORIZATION_HEADER_INVALID",
          errorMessage: "Invalid authorization header format - contains spaces",
        });
      });

      it("Returns 401 Unauthorized", async () => {
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
      beforeEach(async () => {
        const request = buildRequest({
          headers: { Authorization: "Bearer " },
        });

        result = await lambdaHandlerConstructor(dependencies, request, context);
      });

      it("Logs error", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ACTIVE_SESSION_AUTHORIZATION_HEADER_INVALID",
          errorMessage: "Invalid authorization header format - missing token",
        });
      });

      it("Returns 401 Unauthorized", async () => {
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
      beforeEach(async () => {
        dependencies.jweDecrypter = () => new MockJweDecrypterServerError();
        const request = buildRequest({
          headers: {
            Authorization: "Bearer protectedHeader.encryptedKey.iv.ciphertext",
          },
        });

        result = await lambdaHandlerConstructor(dependencies, request, context);
      });

      it("Logs error", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_ACTIVE_SESSION_JWE_DECRYPTION_ERROR",
          errorMessage: "Some mock decryption server error",
        });
      });

      it("Returns 500 Server Error response", async () => {
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
      beforeEach(async () => {
        dependencies.jweDecrypter = () => new MockJweDecrypterClientError();
        const request = buildRequest({
          headers: {
            Authorization: "Bearer protectedHeader.encryptedKey.iv.ciphertext",
          },
        });

        result = await lambdaHandlerConstructor(dependencies, request, context);
      });

      it("Logs error", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_ACTIVE_SESSION_JWE_DECRYPTION_ERROR",
          errorMessage: "Some mock decryption client error",
        });
      });

      it("Returns 400 Bad Request response", async () => {
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
      beforeEach(async () => {
        const request = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
        });
        dependencies.tokenService = () => new MockTokenServiceServerError();

        result = await lambdaHandlerConstructor(dependencies, request, context);
      });

      it("Logs error", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ACTIVE_SESSION_SERVICE_TOKEN_VALIDATION_ERROR",
          errorMessage: "Mock server error",
        });
      });

      it("Returns 500 Server Error response", async () => {
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
      beforeEach(async () => {
        const request = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
        });
        dependencies.tokenService = () => new MockTokenServiceClientError();

        result = await lambdaHandlerConstructor(dependencies, request, context);
      });

      it("Logs error", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ACTIVE_SESSION_SERVICE_TOKEN_VALIDATION_ERROR",
          errorMessage: "Mock client error",
        });
      });

      it("Returns 400 Bad Request response", async () => {
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
      beforeEach(async () => {
        const request = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
        });
        dependencies.sessionService = () =>
          new MockSessionServiceGetErrorResult();

        result = await lambdaHandlerConstructor(dependencies, request, context);
      });

      it("Logs error", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_GET_ACTIVE_SESSION_FAILURE",
          errorMessage: "Mock error when getting session details",
        });
      });

      it("Returns 500 Server Error", async () => {
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
      beforeEach(async () => {
        const request = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
        });
        dependencies.sessionService = () =>
          new MockSessionServiceGetNullSuccessResult();

        result = await lambdaHandlerConstructor(dependencies, request, context);
      });
      it("Returns 404 Not Found", async () => {
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
      beforeEach(async () => {
        const request = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
        });
        dependencies.sessionService = () =>
          new MockSessionServiceGetSuccessResult();

        result = await lambdaHandlerConstructor(dependencies, request, context);
      });

      it("Logs COMPLETED", () => {
        expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_ACTIVE_SESSION_STARTED",
        });
      });

      it("Returns 200 and the session details", async () => {
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
