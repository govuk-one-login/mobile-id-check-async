import { LogAttributes } from "@aws-lambda-powertools/logger/lib/cjs/types/Log";
import { ILoggerAdapter, Logger } from "../logger";
import { LogMessage, RegisteredLogMessages } from "../types";
import { Context } from "aws-lambda";
import { buildLambdaContext } from "../../../testUtils/mockContext";

describe("Logger", () => {
  describe("Given there is a message to log", () => {
    it("Writes a log with registered log data ", () => {
      const loggingAdapter = new MockLoggingAdapter();
      const logger = new Logger<MockMessage>(
        loggingAdapter,
        mockRegisteredLogs,
      );
      logger.log("MOCK_MESSAGE_NAME");
      expect(loggingAdapter.getLogMessages()[0].logMessage).toMatchObject({
        message: "MOCK_MESSAGE_NAME",
        messageCode: "MOBILE_ASYNC_MOCK_MESSAGE_NAME",
      });
    });

    describe("Given lambda context is passed to the logger", () => {
      it("Writes a log including the lambda context", () => {
        const loggingAdapter = new MockLoggingAdapter();
        const logger = new Logger<MockMessage>(
          loggingAdapter,
          mockRegisteredLogs,
        );
        logger.addContext(buildLambdaContext());
        logger.log("MOCK_MESSAGE_NAME");
        expect(loggingAdapter.getLogMessages()[0].logMessage).toMatchObject({
          message: "MOCK_MESSAGE_NAME",
          messageCode: "MOBILE_ASYNC_MOCK_MESSAGE_NAME",
          functionName: "lambdaFunctionName",
          awsRequestId: "awsRequestId",
        });
      });
    });

    describe("Given authSessionId is passed to the logger", () => {
      it("Writes a log including the session data", () => {
        const loggingAdapter = new MockLoggingAdapter();
        const logger = new Logger<MockMessage>(
          loggingAdapter,
          mockRegisteredLogs,
        );
        logger.appendKeys({ authSessionId: "mockAuthSessionId" });
        logger.log("MOCK_MESSAGE_NAME");
        expect(loggingAdapter.getLogMessages()[0].logMessage).toMatchObject({
          message: "MOCK_MESSAGE_NAME",
          messageCode: "MOBILE_ASYNC_MOCK_MESSAGE_NAME",
          authSessionId: "mockAuthSessionId",
        });
      });
    });

    describe("Given custom data is passed into the log message", () => {
      it("Writes a log including custom data", () => {
        const loggingAdapter = new MockLoggingAdapter();
        const logger = new Logger<MockMessage>(
          loggingAdapter,
          mockRegisteredLogs,
        );
        logger.log("MOCK_MESSAGE_NAME", { mockKey: "mockValue" });
        expect(loggingAdapter.getLogMessages()[0].logMessage).toMatchObject({
          message: "MOCK_MESSAGE_NAME",
          messageCode: "MOBILE_ASYNC_MOCK_MESSAGE_NAME",
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

type MockMessage = "MOCK_MESSAGE_NAME";

const mockRegisteredLogs: RegisteredLogMessages<MockMessage> = {
  MOCK_MESSAGE_NAME: {
    messageCode: "MOBILE_ASYNC_MOCK_MESSAGE_NAME",
  },
};
