import { APIGatewayProxyEvent } from "aws-lambda";
import { MockLoggingAdapter } from "../services/logging/tests/mockLogger";
import { buildLambdaContext } from "../testUtils/mockContext";
import { buildRequest } from "../testUtils/mockRequest";
import { lambdaHandlerConstructor } from "./mockProxyHandler";
import { MessageName, registeredLogs } from "./registeredLogs";
import { IMockProxyDependencies } from "./handlerDependencies";
import { Logger } from "../services/logging/logger";
import { errorResult, Result, successResult } from "../utils/result";

describe("Mock Proxy", () => {
  let mockLogger: MockLoggingAdapter<MessageName>;
  let request: APIGatewayProxyEvent;
  let dependencies: IMockProxyDependencies;

  const env = {
    ASYNC_BACKEND_API_URL: "mockUrl",
  };

  beforeEach(() => {
    mockLogger = new MockLoggingAdapter();
    request = buildRequest();
    dependencies = {
      env,
      logger: () => new Logger(mockLogger, registeredLogs),
      proxyRequestService: () => new ProxyRequestServiceSuccessResult(),
    };
  });

  describe("Environment variable validation", () => {
    describe.each(Object.keys(env))("Given %s is missing", (envVar: string) => {
      it("Returns a 500 Server Error response", async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        delete dependencies.env[envVar];
        const result = await lambdaHandlerConstructor(
          dependencies,
          request,
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages()[1].logMessage.message).toBe(
          "ENVIRONMENT_VARIABLE_MISSING",
        );
        expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
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
  });

  describe("Unrecognised endpoint", () => {
    describe("Given the endpoint is not a recognised value", () => {
      it("Logs and returns a 500 Server Error response", async () => {
        const result = await lambdaHandlerConstructor(
          dependencies,
          buildRequest({ path: "/async/unknown" }),
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages()[1].logMessage.message).toBe(
          "UNEXPECTED_PATH",
        );
        expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "Path is not one of the permitted values",
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

  describe("Unrecognised method", () => {
    describe("Given the method is not POST", () => {
      it("Logs and returns a 500 Server Error response", async () => {
        const result = await lambdaHandlerConstructor(
          dependencies,
          buildRequest({ path: "/async/token", httpMethod: "GET" }),
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages()[1].logMessage.message).toBe(
          "UNEXPECTED_HTTP_METHOD",
        );
        expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "Method is not an accepted value",
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
  describe("Request Proxy Service Failure", () => {
    it("Log and returns a 500 response if there is an unexpected error getting the token", async () => {
      const result = await lambdaHandlerConstructor(
        {
          ...dependencies,
          proxyRequestService: () => new ProxyRequestServiceErrorResult(),
        },
        buildRequest({
          path: "/async/token",
          httpMethod: "POST",
        }),
        buildLambdaContext(),
      );

      expect(mockLogger.getLogMessages()[1].logMessage.message).toBe(
        "PROXY_REQUEST_ERROR",
      );
      expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
        errorMessage: "mockProxyRequestFailedErrorMessage",
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

  describe("Request Proxy Service Success", () => {
    // Success here means that there was a response from the request to the proxy
    // It does not mean that the response from the proxy is a 2XX

    it("Response contains the headers,body,status code from the proxy", async () => {
      const result = await lambdaHandlerConstructor(
        {
          ...dependencies,
          proxyRequestService: () => new ProxyRequestServiceSuccessResult(),
        },
        buildRequest({
          path: "/async/token",
          httpMethod: "POST",
        }),
        buildLambdaContext(),
      );

      expect(mockLogger.getLogMessages()[1].logMessage.message).toBe(
        "COMPLETED",
      );

      expect(result).toStrictEqual({
        headers: {
          mockHeader: "mockHeaderValue",
          mockAnotherHeader: "mockAnotherHeaderValue",
        },
        statusCode: 201,
        body: JSON.stringify({
          mockKey: "mockValue",
        }),
      });
    });
  });
});

class ProxyRequestServiceErrorResult {
  makeProxyRequest = async (): Promise<
    Result<{
      statusCode: number;
      body: string;
      headers: { [key in string]: string };
    }>
  > => {
    return Promise.resolve(
      errorResult({
        errorCategory: "SERVER_ERROR",
        errorMessage: "mockProxyRequestFailedErrorMessage",
      }),
    );
  };
}

class ProxyRequestServiceSuccessResult {
  makeProxyRequest = async (): Promise<
    Result<{
      statusCode: number;
      body: string;
      headers: { [key in string]: string };
    }>
  > => {
    return Promise.resolve(
      successResult({
        statusCode: 201,
        body: JSON.stringify({ mockKey: "mockValue" }),
        headers: {
          mockHeader: "mockHeaderValue",
          mockAnotherHeader: "mockAnotherHeaderValue",
        },
      }),
    );
  };
}
