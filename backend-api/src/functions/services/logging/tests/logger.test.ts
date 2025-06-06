import { buildLambdaContext } from "../../../testUtils/mockContext";
import { Logger } from "../logger";
import { RegisteredLogMessages } from "../types";
import { MockLoggingAdapter } from "./mockLogger";

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

    describe("Given sessionId is passed to the logger", () => {
      it("Writes a log including the session data", () => {
        const loggingAdapter = new MockLoggingAdapter();
        const logger = new Logger<MockMessage>(
          loggingAdapter,
          mockRegisteredLogs,
        );
        logger.setSessionId({ sessionId: "mockSessionId" });
        logger.log("MOCK_MESSAGE_NAME");
        expect(loggingAdapter.getLogMessages()[0].logMessage).toMatchObject({
          message: "MOCK_MESSAGE_NAME",
          messageCode: "MOBILE_ASYNC_MOCK_MESSAGE_NAME",
          sessionId: "mockSessionId",
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

type MockMessage = "MOCK_MESSAGE_NAME";

const mockRegisteredLogs: RegisteredLogMessages<MockMessage> = {
  MOCK_MESSAGE_NAME: {
    messageCode: "MOBILE_ASYNC_MOCK_MESSAGE_NAME",
  },
};
