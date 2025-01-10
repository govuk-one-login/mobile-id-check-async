import { APIGatewayProxyEvent } from "aws-lambda";
import { MockLoggingAdapter } from "../services/logging/tests/mockLogger";
import { buildLambdaContext } from "../testUtils/mockContext";
import { buildRequest } from "../testUtils/mockRequest";
import { lambdaHandlerConstructor } from "./proxyHandler";
import { MessageName, registeredLogs } from "./registeredLogs";
import { IMockProxyDependencies } from "./handlerDependencies";
import { Logger } from "../services/logging/logger";
import {
  ErrorCategory,
  errorResult,
  Result,
  successResult,
} from "../utils/result";
import {
  IMakeProxyRequest,
  RequestOptions,
} from "./proxyRequestService/proxyRequestService";

describe("Mock Proxy", () => {
  let mockLogger: MockLoggingAdapter<MessageName>;
  let request: APIGatewayProxyEvent;
  let dependencies: IMockProxyDependencies;

  const env = {
    PRIVATE_API_URL: "mockUrl",
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
          errorMessage: "API method is not POST",
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
    describe("Given there are headers in the request", () => {
      it("Returns the proxy result", async () => {
        const mockProxyRequestServiceSuccessResult =
          new ProxyRequestServiceSuccessResult();
        const result = await lambdaHandlerConstructor(
          {
            ...dependencies,
            proxyRequestService: () => mockProxyRequestServiceSuccessResult,
          },
          buildRequest({
            path: "/async/token",
            headers: {
              "X-Custom-Auth": "mockCustomAuthHeaderValue",
              "non-standard-header": undefined,
            },
            httpMethod: "POST",
          }),
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages()[1].logMessage.message).toBe(
          "COMPLETED",
        );
        expect(mockProxyRequestServiceSuccessResult.headers).toMatchObject([
          { Authorization: "mockCustomAuthHeaderValue" },
        ]);

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

    describe("Given there are no headers in the request", () => {
      it("Returns the proxy result", async () => {
        const result = await lambdaHandlerConstructor(
          {
            ...dependencies,
            proxyRequestService: () =>
              new ProxyRequestServiceSuccessResultWithoutHeaders(),
          },
          buildRequest({
            path: "/async/token",
            headers: undefined,
            httpMethod: "POST",
          }),
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages()[1].logMessage.message).toBe(
          "COMPLETED",
        );

        expect(result).toStrictEqual({
          headers: {},
          statusCode: 201,
          body: JSON.stringify({
            mockKey: "mockValue",
          }),
        });
      });
    });

    describe("Given the HOST header is present", () => {
      it("Strips the header and returns the proxy result", async () => {
        const proxyRequestServiceMock = new ProxyRequestServiceSuccessResult();
        const result = await lambdaHandlerConstructor(
          {
            ...dependencies,
            proxyRequestService: () => proxyRequestServiceMock,
          },
          buildRequest({
            path: "/async/token",
            headers: { HOST: "mockHostHeader" },
            httpMethod: "POST",
          }),
          buildLambdaContext(),
        );

        expect(proxyRequestServiceMock.headers).toMatchObject([{}]);

        expect(mockLogger.getLogMessages()[1].logMessage.message).toBe(
          "COMPLETED",
        );

        expect(result).toStrictEqual({
          headers: {
            mockAnotherHeader: "mockAnotherHeaderValue",
            mockHeader: "mockHeaderValue",
          },
          statusCode: 201,
          body: JSON.stringify({
            mockKey: "mockValue",
          }),
        });
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
        errorCategory: ErrorCategory.SERVER_ERROR,
        errorMessage: "mockProxyRequestFailedErrorMessage",
      }),
    );
  };
}

class ProxyRequestServiceSuccessResult implements IMakeProxyRequest {
  readonly headers: unknown[] = [];
  makeProxyRequest = async (
    requestOptions: RequestOptions,
  ): Promise<
    Result<{
      statusCode: number;
      body: string;
      headers: { [key in string]: string };
    }>
  > => {
    this.headers.push(requestOptions.headers);
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
class ProxyRequestServiceSuccessResultWithoutHeaders
  implements IMakeProxyRequest
{
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
        headers: {},
      }),
    );
  };
}
