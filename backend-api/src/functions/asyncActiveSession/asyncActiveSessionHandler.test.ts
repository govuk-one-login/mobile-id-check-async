import { APIGatewayProxyResult } from "aws-lambda";
import { buildRequest } from "../testUtils/mockRequest";
import { lambdaHandlerConstructor } from "./asyncActiveSessionHandler";
import { IAsyncActiveSessionDependencies } from "./handlerDependencies";
import { MockLoggingAdapter } from "../services/logging/tests/mockLogger";
import { MessageName, registeredLogs } from "./registeredLogs";
import { Logger } from "../services/logging/logger";
import { MockJWTBuilder } from "../testUtils/mockJwt";
import { errorResult, Result } from "../utils/result";
import { ITokenService, TokenService } from "./tokenService/tokenService";
import { KMSAdapter } from "../adapters/kmsAdapter";

const env = {
  STS_JWKS_ENDPOINT: "https://mockUrl.com",
  ENCRYPTION_KEY_ARN: "mockEncryptionKeyArn",
};

describe("Async Active Session", () => {
  let dependencies: IAsyncActiveSessionDependencies;
  let mockLoggingAdapter: MockLoggingAdapter<MessageName>;

  beforeEach(() => {
    mockLoggingAdapter = new MockLoggingAdapter();
    dependencies = {
      env,
      logger: () => new Logger(mockLoggingAdapter, registeredLogs),
      kmsAdapter: () => new KMSAdapter("mockEncryptionKeyArn"),
      tokenService: () =>
        new TokenService(new KMSAdapter("mockEncryptionKeyArn")),
    };
  });

  describe("Environment variable validation", () => {
    describe.each(Object.keys(env))("Given %s is missing", (envVar: string) => {
      it("Returns a 500 Server Error response", async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        delete dependencies.env[envVar];
        const event = buildRequest();
        const result = await lambdaHandlerConstructor(dependencies, event);

        expect(mockLoggingAdapter.getLogMessages()[0].logMessage.message).toBe(
          "ENVIRONMENT_VARIABLE_MISSING",
        );
        expect(mockLoggingAdapter.getLogMessages()[0].data).toStrictEqual({
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

    describe("Given the STS_JWKS_ENDPOINT is not a URL", () => {
      it("Returns a 500 Server Error response", async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        dependencies.env["STS_JWKS_ENDPOINT"] = "mockInvalidSessionTtlSecs";
        const event = buildRequest();
        const result = await lambdaHandlerConstructor(dependencies, event);

        expect(mockLoggingAdapter.getLogMessages()[0].logMessage.message).toBe(
          "ENVIRONMENT_VARIABLE_MISSING",
        );
        expect(mockLoggingAdapter.getLogMessages()[0].data).toStrictEqual({
          errorMessage: "STS_JWKS_ENDPOINT is not a URL",
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
        );

        expect(mockLoggingAdapter.getLogMessages()[0].logMessage.message).toBe(
          "AUTHENTICATION_HEADER_INVALID",
        );
        expect(mockLoggingAdapter.getLogMessages()[0].data).toStrictEqual({
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

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
        );

        expect(mockLoggingAdapter.getLogMessages()[0].logMessage.message).toBe(
          "AUTHENTICATION_HEADER_INVALID",
        );
        expect(mockLoggingAdapter.getLogMessages()[0].data).toStrictEqual({
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

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
        );

        expect(mockLoggingAdapter.getLogMessages()[0].logMessage.message).toBe(
          "AUTHENTICATION_HEADER_INVALID",
        );
        expect(mockLoggingAdapter.getLogMessages()[0].data).toStrictEqual({
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

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
        );

        expect(mockLoggingAdapter.getLogMessages()[0].logMessage.message).toBe(
          "AUTHENTICATION_HEADER_INVALID",
        );
        expect(mockLoggingAdapter.getLogMessages()[0].data).toStrictEqual({
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

  describe("Get sub from access token", () => {
    describe("Given an unexpected error is returned", () => {
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

        expect(mockLoggingAdapter.getLogMessages()[0].logMessage.message).toBe(
          "INTERNAL_SERVER_ERROR",
        );
        expect(mockLoggingAdapter.getLogMessages()[0].data).toStrictEqual({
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

    describe("Given decrypting access token failed", () => {
      it("Logs and returns 400 Bad Request response", async () => {
        const jwtBuilder = new MockJWTBuilder();
        const event = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
        });

        dependencies.tokenService = () =>
          new MockTokenServiceDecryptionFailed();

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
        );

        expect(mockLoggingAdapter.getLogMessages()[0].logMessage.message).toBe(
          "FAILED_TO_GET_SUB_FROM_SERVICE_TOKEN",
        );
        expect(mockLoggingAdapter.getLogMessages()[0].data).toStrictEqual({
          errorMessage: "Mock decryption error",
        });

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "failed decrypting service token jwt",
          }),
        });
      });
    });
  });
});

class MockTokenServiceServerError implements ITokenService {
  async getSubFromToken(): Promise<Result<string>> {
    return errorResult({
      errorMessage: "Mock server error",
      errorCategory: "SERVER_ERROR",
    });
  }
}

class MockTokenServiceDecryptionFailed {
  async getSubFromToken(): Promise<Result<string>> {
    return errorResult({
      errorMessage: "Mock decryption error",
      errorCategory: "CLIENT_ERROR",
    });
  }
}
