import { APIGatewayProxyResult } from "aws-lambda";
import { buildRequest } from "../testUtils/mockRequest";
import { lambdaHandlerConstructor } from "./asyncActiveSessionHandler";
import { IAsyncActiveSessionDependencies } from "./handlerDependencies";
import { MockLoggingAdapter } from "../services/logging/tests/mockLogger";
import { MessageName, registeredLogs } from "./registeredLogs";
import { Logger } from "../services/logging/logger";

describe("Async Active Session", () => {
  let dependencies: IAsyncActiveSessionDependencies;
  let mockLogger: MockLoggingAdapter<MessageName>;

  beforeEach(() => {
    mockLogger = new MockLoggingAdapter();
    dependencies = {
      logger: () => new Logger(mockLogger, registeredLogs),
    };
  });

  describe("Access token validation", () => {
    describe("Given Authentication header is missing", () => {
      it("Returns 401 Unauthorized", async () => {
        const event = buildRequest();

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
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

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
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

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
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

        const result: APIGatewayProxyResult = await lambdaHandlerConstructor(
          dependencies,
          event,
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
});
