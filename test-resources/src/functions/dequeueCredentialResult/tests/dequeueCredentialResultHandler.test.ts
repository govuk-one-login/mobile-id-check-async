import { expect } from "@jest/globals";
import { Context, SQSBatchResponse, SQSEvent } from "aws-lambda";
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
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    dependencies = {
      env,
    };
    context = buildLambdaContext();
    consoleInfoSpy = jest.spyOn(console, "info");
    consoleErrorSpy = jest.spyOn(console, "error");
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
    let result: SQSBatchResponse;

    beforeEach(async () => {
      const event: SQSEvent = {
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

  describe("Given credential result validation fails", () => {
    describe("Given credential result is not valid JSON", () => {
      let result: SQSBatchResponse;

      beforeEach(async () => {
        const event: SQSEvent = {
          Records: [failingSQSRecordBodyInvalidJSON],
        };
        result = await lambdaHandlerConstructor(dependencies, event, context);
      });

      it("Returns an error message", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_INVALID_JSON",
        });
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          message: "Failed to parse credential result. Invalid JSON.",
        });
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          recordBody: "{ mockInvalidJSON",
        });
      });

      it("Returns no batchItemFailures to be reprocessed", () => {
        expect(result).toStrictEqual({ batchItemFailures: [] });
      });
    });

    describe("Given credential result is missing a subjectIdentifier", () => {
      let result: SQSBatchResponse;

      beforeEach(async () => {
        const event: SQSEvent = {
          Records: [failingSQSRecordBodyMissingSub],
        };
        result = await lambdaHandlerConstructor(dependencies, event, context);
      });

      it("Returns an error message", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_MISSING_SUB",
        });
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          message: "Credential result is missing a subjectIdentifier",
        });
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          credentialResult: { timestamp: "mockTimestamp" },
        });
      });

      it("Returns no batchItemFailures to be reprocessed", () => {
        expect(result).toStrictEqual({ batchItemFailures: [] });
      });
    });

    describe("Given credential result is missing a timestamp", () => {
      let result: SQSBatchResponse;

      beforeEach(async () => {
        const event: SQSEvent = {
          Records: [failingSQSRecordBodyMissingTimestamp],
        };
        result = await lambdaHandlerConstructor(dependencies, event, context);
      });

      it("Returns an error message", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_MISSING_TIMESTAMP",
        });
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          message: "Credential result is missing a timestamp",
        });
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          credentialResult: { subjectIdentifier: "mockSubjectIdentifier" },
        });
      });

      it("Returns no batchItemFailures to be reprocessed", () => {
        expect(result).toStrictEqual({ batchItemFailures: [] });
      });
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

const failingSQSRecordBodyInvalidJSON = {
  ...passingSQSRecord,
  messageId: "8e30d89a-de80-47e4-88e7-681b415a2549",
  body: "{ mockInvalidJSON",
};

const failingSQSRecordBodyMissingSub = {
  ...passingSQSRecord,
  messageId: "6f50c504-818f-4e9f-9a7f-785f532b45f2",
  body: JSON.stringify({ timestamp: "mockTimestamp" }),
};

const failingSQSRecordBodyMissingTimestamp = {
  ...passingSQSRecord,
  messageId: "6e7f7694-96ce-4248-9ee0-203c0c39d864",
  body: JSON.stringify({ subjectIdentifier: "mockSubjectIdentifier" }),
};
