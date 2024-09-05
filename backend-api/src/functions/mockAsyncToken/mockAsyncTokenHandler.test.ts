import { APIGatewayProxyEvent } from "aws-lambda";
import { MockLoggingAdapter } from "../services/logging/tests/mockLogger";
import { buildLambdaContext } from "../testUtils/mockContext";
import { buildRequest } from "../testUtils/mockRequest";
import { lambdaHandlerConstructor } from "./mockAsyncTokenHandler";
import { MessageName, registeredLogs } from "./registeredLogs";
import { IMockAsyncTokenDependencies } from "./handlerDependencies";
import { Logger } from "../services/logging/logger";
import { errorResult, Result } from "../utils/result";

describe("Mock async token", () => {
  let mockLogger: MockLoggingAdapter<MessageName>;
  let request: APIGatewayProxyEvent;
  let dependencies: IMockAsyncTokenDependencies;

  const env = {
    ASYNC_BACKEND_API_URL: "mockUrl",
  };

  beforeEach(() => {
    mockLogger = new MockLoggingAdapter();
    request = buildRequest({ body: "grant_type=client_credentials" });
    dependencies = {
      env,
      logger: () => new Logger(mockLogger, registeredLogs),
      proxyRequestService: () => new ProxyRequestServiceErrorResult(),
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
  describe("Request Proxy Service", () => {
    it("Log and returns a 500 response if there is an unexpected error getting the token", async () => {
      const result = await lambdaHandlerConstructor(
        dependencies,
        request,
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
          error_description: "mockProxyRequestFailedErrorMessage",
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
