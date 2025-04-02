import { SQSEvent } from "aws-lambda";
import "aws-sdk-client-mock-jest";
import { NOW_IN_MILLISECONDS } from "../../../../tests/utils/unitTestData";
import { Logger } from "../../services/logging/logger";
import { MockLoggingAdapter } from "../../services/logging/tests/mockLoggingAdapter";
import { buildLambdaContext } from "../../testUtils/mockContext";
import {
  IDequeueCredentialResultDependencies,
  lambdaHandlerConstructor,
} from "../dequeueCredentialResultHandler";
import { MessageName, registeredLogs } from "../registeredLogs";
import { passingSQSRecord } from "./testData";

describe("Dequeue credential result", () => {
  let dependencies: IDequeueCredentialResultDependencies;
  let mockLogger: MockLoggingAdapter<MessageName>;
  const env = {};

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);
    mockLogger = new MockLoggingAdapter();
    dependencies = {
      env,
      logger: () => new Logger(mockLogger, registeredLogs),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("Happy path", () => {
    describe("Given there is one record in the event", () => {
      beforeEach(async () => {
        const event: SQSEvent = {
          Records: [passingSQSRecord],
        };
        await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );
      });

      it("Logs STARTED and COMPLETED", async () => {
        expect(mockLogger.getLogMessages().length).toEqual(2);
        expect(mockLogger.getLogMessages()[0].logMessage.message).toEqual(
          "STARTED",
        );
        expect(mockLogger.getLogMessages()[1].logMessage.message).toEqual(
          "COMPLETED",
        );
      });
    });
  });
});
