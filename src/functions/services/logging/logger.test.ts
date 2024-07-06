import { Logger } from "./logger";
import {
  LogMessage,
  RegisteredLogMessages,
  MessageName,
  ILogger,
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
      expect(loggingAdapter.getLogMessages()[0]).toMatchObject({
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
        expect(loggingAdapter.getLogMessages()[0]).toMatchObject({
          message: "mockMessage",
          messageCode: "MOBILE_ASYNC_MOCK_MESSAGE_NAME",
          messageName: "MOCK_MESSAGE_NAME",
          functionName: "lambdaFunctionName",
          awsRequestId: "awsRequestId",
        });
      });
    });
  });
});

class MockLoggingAdapter<T extends string> implements ILogger<T> {
  logMessages: LogMessage<T>[] = [];
  private contextBody: Context | undefined;
  info = (logMessage: LogMessage<T>): void => {
    const logMessageWithContext = { ...this.contextBody, ...logMessage };
    this.logMessages.push(logMessageWithContext);
  };
  getLogMessages = (): LogMessage<T>[] => {
    return this.logMessages;
  };

  addContext = (lambdaContext: Context) => {
    this.contextBody = lambdaContext;
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
