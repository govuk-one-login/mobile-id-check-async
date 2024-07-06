import { LogAttributes } from "@aws-lambda-powertools/logger/lib/cjs/types/Log";
import { Logger } from "./logger";
import {
  LogMessage,
  RegisteredLogMessages,
  MessageName,
  ILoggerAdapter,
} from "./types";
import { Context } from "aws-lambda";

describe("Logger", () => {
  describe("Given there is a message to log", () => {
    it("Writes a log with registered log data ", () => {
      const loggingAdapter = new MockLoggingAdapter();
      const mockLogger = new Logger<MessageName>(
        loggingAdapter,
        mockRegisteredLogs,
      );
      mockLogger.log("MOCK_MESSAGE_NAME");
      expect(loggingAdapter.getLogMessages()[0].logMessage).toMatchObject({
        message: "mockMessage",
        messageCode: "MOBILE_ASYNC_MOCK_MESSAGE_NAME",
        messageName: "MOCK_MESSAGE_NAME",
      });
    });

    describe("Given lambda context is passed to the logger", () => {
      it("Writes a log including the lambda context", () => {
        const loggingAdapter = new MockLoggingAdapter();
        const mockLogger = new Logger<MessageName>(
          loggingAdapter,
          mockRegisteredLogs,
        );
        mockLogger.addContext(buildLambdaContext());
        mockLogger.log("MOCK_MESSAGE_NAME");
        expect(loggingAdapter.getLogMessages()[0].logMessage).toMatchObject({
          message: "mockMessage",
          messageCode: "MOBILE_ASYNC_MOCK_MESSAGE_NAME",
          messageName: "MOCK_MESSAGE_NAME",
          functionName: "lambdaFunctionName",
          awsRequestId: "awsRequestId",
        });
      });
    });

    describe("Given authSessionId is passed to the logger", () => {
      it("Writes a log including the session data", () => {
        const loggingAdapter = new MockLoggingAdapter();
        const mockLogger = new Logger<MessageName>(
          loggingAdapter,
          mockRegisteredLogs,
        );
        mockLogger.appendKeys({ authSessionId: "mockAuthSessionId" });
        mockLogger.log("MOCK_MESSAGE_NAME");
        expect(loggingAdapter.getLogMessages()[0].logMessage).toMatchObject({
          message: "mockMessage",
          messageCode: "MOBILE_ASYNC_MOCK_MESSAGE_NAME",
          messageName: "MOCK_MESSAGE_NAME",
          authSessionId: "mockAuthSessionId",
        });
      });
    });

    describe("Given custom data is passed into the log message", () => {
      it("Writes a log including custom data", () => {
        const loggingAdapter = new MockLoggingAdapter();
        const mockLogger = new Logger<MessageName>(
          loggingAdapter,
          mockRegisteredLogs,
        );
        mockLogger.log("MOCK_MESSAGE_NAME", { mockKey: "mockValue" });
        expect(loggingAdapter.getLogMessages()[0].logMessage).toMatchObject({
          message: "mockMessage",
          messageCode: "MOBILE_ASYNC_MOCK_MESSAGE_NAME",
          messageName: "MOCK_MESSAGE_NAME",
        });
        expect(loggingAdapter.getLogMessages()[0].data).toMatchObject({
          mockKey: "mockValue",
        });
      });
    });
  });
});

export class MockLoggingAdapter<T extends string> implements ILoggerAdapter<T> {
  logMessages: { logMessage: LogMessage<T>; data: LogAttributes }[] = [];
  private contextBody: Context | undefined;
  private temporaryKeys: { [key in string]: string } | undefined;
  info = (logMessage: LogMessage<T>, data: LogAttributes): void => {
    const enrichedLogMessage = {
      ...this.contextBody,
      ...this.temporaryKeys,
      ...logMessage,
    };
    this.logMessages.push({ logMessage: enrichedLogMessage, data });
  };
  getLogMessages = (): { logMessage: LogMessage<T>; data: LogAttributes }[] => {
    return this.logMessages;
  };

  addContext = (lambdaContext: Context) => {
    this.contextBody = lambdaContext;
  };
  appendKeys = (keys: { authSessionId: string }) => {
    this.temporaryKeys = { ...keys };
  };
}

export const mockRegisteredLogs: RegisteredLogMessages<MessageName> = {
  MOCK_MESSAGE_NAME: {
    message: "mockMessage",
    messageCode: "MOBILE_ASYNC_MOCK_MESSAGE_NAME",
  },
};

export function buildLambdaContext(): Context {
  return {
    callbackWaitsForEmptyEventLoop: true,
    functionName: "lambdaFunctionName",
    functionVersion: "1",
    invokedFunctionArn: "arn:12345",
    memoryLimitInMB: "1028",
    awsRequestId: "awsRequestId",
    logGroupName: "logGroup",
    logStreamName: "logStream",
    getRemainingTimeInMillis: () => {
      return 2000;
    },
    done: function (): void {},
    fail: function (): void {},
    succeed: function (): void {},
  };
}
