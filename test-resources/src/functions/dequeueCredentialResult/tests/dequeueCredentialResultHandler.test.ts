import { expect } from "@jest/globals";
import {
  Context,
  SQSBatchResponse,
  SQSEvent
} from "aws-lambda";
import "aws-sdk-client-mock-jest";
import { logger } from "../../common/logging/logger";
import "../../testUtils/matchers";
import { buildLambdaContext } from "../../testUtils/mockContext";
import {
  IDequeueCredentialResultDependencies,
  lambdaHandlerConstructor,
} from "../dequeueCredentialResultHandler";

describe("Dequeue credential result", () => {
  const env = {};
  let dependencies: IDequeueCredentialResultDependencies;
  let context: Context;
  let consoleInfoSpy: jest.SpyInstance;

  beforeEach(() => {
    dependencies = {
      env,
    };
    context = buildLambdaContext();
    consoleInfoSpy = jest.spyOn(console, "info");
  });

  describe("On every invocation", () => {
    let event: SQSEvent;

    beforeEach(async () => {
      event = {
        Records: [passingSQSRecord],
      };
      await lambdaHandlerConstructor(dependencies, event, context);
    });
    it("Adds context and version to log attributes and logs STARTED message", () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_STARTED",
        functionVersion: "1",
        function_arn: "arn:12345", // example field to verify that context has been added
      });
    });
    it("Clears pre-existing log attributes", async () => {
      logger.appendKeys({ testKey: "testValue" });
      await lambdaHandlerConstructor(dependencies, event, context);
      expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
        testKey: "testValue",
      });
    });
  });

  describe("Given there are no messages to be processed", () => {
    let event: SQSEvent;
    let result: SQSBatchResponse;

    beforeEach(async () => {
      event = {
        Records: [],
      };

      result = await lambdaHandlerConstructor(dependencies, event, context);
    });

    it("Logs an empty array", async () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode:
          "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_PROCESSED_MESSAGES",
      });

      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        processedMessages: [],
      });
    });

    it("Logs COMPLETED", () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_COMPLETED",
      });
    });

    it("Returns an empty array for batchItemFailures", () => {
      expect(result).toStrictEqual({ batchItemFailures: [] });
    });
  });

  describe("Happy path", () => {
    describe("Given the Lambda is triggered", () => {
      beforeEach(async () => {
        const event: SQSEvent = {
          Records: [passingSQSRecord],
        };
        await lambdaHandlerConstructor(dependencies, event, context);
      });

      it("Logs COMPLETED", async () => {
        expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
          messageCode: "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_COMPLETED",
        });
      });
    });
  });
});

const passingSQSRecord = {
  messageId: "c2098377-619a-449f-b2b4-254b6c41aff4",
  receiptHandle: "mockReceiptHandle",
  body: "",
  attributes: {
    ApproximateReceiveCount: "mockApproximateReceiveCount",
    SentTimestamp: "mockSentTimestamp",
    SenderId: "mockSenderId",
    ApproximateFirstReceiveTimestamp: "mockApproximateFirstReceiveTimestamp",
  },
  messageAttributes: {},
  md5OfBody: "mockMd5OfBody",
  eventSource: "mockEventSource",
  eventSourceARN: "mockEventSourceARN",
  awsRegion: "mockAwsRegion",
};
