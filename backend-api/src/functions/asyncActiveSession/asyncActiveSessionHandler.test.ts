import { APIGatewayProxyResult } from "aws-lambda";
import { buildRequest } from "../testUtils/mockRequest";
import { lambdaHandlerConstructor } from "./asyncActiveSessionHandler";
import { IAsyncActiveSessionDependencies } from "./handlerDependencies";
import { MockLoggingAdapter } from "../services/logging/tests/mockLogger";
import { MessageName, registeredLogs } from "./registeredLogs";
import { Logger } from "../services/logging/logger";
import { MockJWTBuilder } from "../testUtils/mockJwt";
import { errorResult, Result } from "../utils/result";
import { TokenService } from "./tokenService/tokenService";

const env = {
  STS_JWKS_ENDPOINT: "https://mockUrl.com",
};

describe("Async Active Session", () => {
  let dependencies: IAsyncActiveSessionDependencies;
  let mockLoggingAdapter: MockLoggingAdapter<MessageName>;

  beforeEach(() => {
    mockLoggingAdapter = new MockLoggingAdapter();
    dependencies = {
      env,
      logger: () => new Logger(mockLoggingAdapter, registeredLogs),
      tokenService: new TokenService()
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
      it('Logs and returns 500 Server Error response', async () => {
        const jwtBuilder = new MockJWTBuilder();
        const event = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
        });

        dependencies.tokenService = () => new MockTokenServiceServerError()

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
        );

        expect(mockLoggingAdapter.getLogMessages()[0].logMessage.message).toBe(
          "JWT_CLAIM_INVALID",
        );
        expect(mockLoggingAdapter.getLogMessages()[0].data).toStrictEqual({
          errorMessage: "Invalid token",
        });

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 500,
          body: JSON.stringify({
            error: "server_error",
            error_description: "Mock server error",
          }),
        });
      })
    })

    describe("Given token is invalid", () => {
      it("Logs and returns 400 Bad Request response", async () => {
        const jwtBuilder = new MockJWTBuilder();
        const event = buildRequest({
          headers: { Authorization: `Bearer ${jwtBuilder.getEncodedJwt()}` },
        });

        dependencies.tokenService = () => new MockTokenServiceDecodeTokenfailure()

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
        );

        expect(mockLoggingAdapter.getLogMessages()[0].logMessage.message).toBe(
          "JWT_CLAIM_INVALID",
        );
        expect(mockLoggingAdapter.getLogMessages()[0].data).toStrictEqual({
          errorMessage: "Invalid token",
        });

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "Mock decoding token error",
          }),
        });
      });
    });
  })
});

class MockTokenServiceServerError {
  getSubFromToken(): Result<string> {
    return errorResult({
      errorMessage: "Server error",
      errorCategory: "SERVER_ERROR",
    })
  }
}

class MockTokenServiceDecodeTokenfailure {
  getSubFromToken(): Result<string> {
    return errorResult({
      errorMessage: "Invalid token",
      errorCategory: "CLIENT_ERROR",
    })
  }
}