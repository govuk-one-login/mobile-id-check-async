import { expect } from "@jest/globals";
import { Context, SQSBatchResponse, SQSEvent } from "aws-lambda";
import "aws-sdk-client-mock-jest";
import { logger } from "../common/logging/logger";
import { emptyFailure, emptySuccess } from "../common/utils/result";
import "../testUtils/matchers";
import { buildLambdaContext } from "../testUtils/mockContext";
import { lambdaHandlerConstructor } from "./dequeueCredentialResultHandler";
import { failingSQSRecordBodyMissingSub, validSQSRecord } from "./unitTestData";
import { NOW_IN_MILLISECONDS } from "../dequeue/tests/testData";
import { IDequeueCredentialResultDependencies } from "./handlerDependencies";
import { IDynamoDbAdapter } from "../common/dynamoDbAdapter/dynamoDbAdapter";

describe("Dequeue credential result", () => {
  const env = {
    CREDENTIAL_RESULT_TTL_DURATION_IN_SECONDS: "3600",
    CREDENTIAL_RESULT_TABLE_NAME: "mockCredentialResultTableName",
  };
  let dependencies: IDequeueCredentialResultDependencies;
  let context: Context;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let result: SQSBatchResponse;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);
    dependencies = {
      env: { ...env },
      getCredentialResultRegistry: () => mockCredentialResultRegistrySuccess,
    };
    context = buildLambdaContext();
    consoleInfoSpy = jest.spyOn(console, "info");
    consoleErrorSpy = jest.spyOn(console, "error");
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("On every invocation", () => {
    let event: SQSEvent;

    beforeEach(async () => {
      event = {
        Records: [validSQSRecord],
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

  describe("Config validation", () => {
    describe.each([
      ["CREDENTIAL_RESULT_TTL_DURATION_IN_SECONDS"],
      ["CREDENTIAL_RESULT_TABLE_NAME"],
    ])("Given %s environment variable is missing", (envVar: string) => {
      beforeEach(async () => {
        delete dependencies.env[envVar];
        const event: SQSEvent = {
          Records: [validSQSRecord, failingSQSRecordBodyMissingSub],
        };
        result = await lambdaHandlerConstructor(dependencies, event, context);
      });

      it("returns 500 Internal server error", async () => {
        expect(result).toStrictEqual({
          batchItemFailures: [
            {
              itemIdentifier: "c2098377-619a-449f-b2b4-254b6c41aff4",
            },
            {
              itemIdentifier: "6f50c504-818f-4e9f-9a7f-785f532b45f2",
            },
          ],
        });
      });

      it("logs INVALID_CONFIG", async () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_INVALID_CONFIG",
          data: {
            missingEnvironmentVariables: [envVar],
          },
        });
      });
    });
  });

  describe("Given the records array is empty", () => {
    beforeEach(async () => {
      const event: SQSEvent = {
        Records: [],
      };
      result = await lambdaHandlerConstructor(dependencies, event, context);
    });

    it("Logs COMPLETED", () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_COMPLETED",
      });
    });

    it("Returns no batchItemFailures", () => {
      expect(result).toStrictEqual({ batchItemFailures: [] });
    });
  });

  describe("Given credential result validation fails", () => {
    beforeEach(async () => {
      const event: SQSEvent = {
        Records: [failingSQSRecordBodyMissingSub],
      };
      result = await lambdaHandlerConstructor(dependencies, event, context);
    });

    it("Logs an error message", () => {
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        messageCode: "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_MESSAGE_INVALID",
        message: "Credential result message is missing or invalid",
        errorMessage: "sub is missing from record body",
      });
    });

    it("Returns no batchItemFailures", () => {
      expect(result).toStrictEqual({ batchItemFailures: [] });
    });
  });

  describe("Given the lambda receives one message", () => {
    describe("Given the message is valid", () => {
      describe("Given writing to dynamoDB fails", () => {
        beforeEach(async () => {
          dependencies.getCredentialResultRegistry = () =>
            mockCredentialResultRegistryPutItemFailure;
          const event: SQSEvent = {
            Records: [validSQSRecord],
          };
          result = await lambdaHandlerConstructor(dependencies, event, context);
        });

        it("Logs COMPLETED", () => {
          expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
            messageCode: "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_COMPLETED",
          });
        });

        it("Logs processed messages", () => {
          expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
            messageCode:
              "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_PROCESS_MESSAGE_SUCCESS",
            processedMessage: {
              sub: "mockSub",
              sentTimestamp: "mockSentTimestamp",
            },
          });
        });

        it("Returns an item in the batchItemFailures array", () => {
          expect(result).toStrictEqual({
            batchItemFailures: [
              { itemIdentifier: "c2098377-619a-449f-b2b4-254b6c41aff4" },
            ],
          });
        });
      });

      describe("Given writing to dynamoDB is successful", () => {
        beforeEach(async () => {
          const event: SQSEvent = {
            Records: [validSQSRecord],
          };
          result = await lambdaHandlerConstructor(dependencies, event, context);
        });

        it("Logs COMPLETED", () => {
          expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
            messageCode: "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_COMPLETED",
          });
        });

        it("Logs processed messages", () => {
          expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
            messageCode:
              "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_PROCESS_MESSAGE_SUCCESS",
            processedMessage: {
              sub: "mockSub",
              sentTimestamp: "mockSentTimestamp",
            },
          });
        });

        it("Returns no batchItemFailures", () => {
          expect(result).toStrictEqual({ batchItemFailures: [] });
        });
      });
    });
  });

  describe("Given the lambda receives more than one message in a batch", () => {
    describe("Given one message is valid and one message is invalid", () => {
      beforeEach(async () => {
        const event: SQSEvent = {
          Records: [failingSQSRecordBodyMissingSub, validSQSRecord],
        };
        result = await lambdaHandlerConstructor(dependencies, event, context);
      });

      it("Logs an error message", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_MESSAGE_INVALID",
          message: "Credential result message is missing or invalid",
          errorMessage: "sub is missing from record body",
        });
      });

      it("Logs COMPLETED", () => {
        expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
          messageCode: "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_COMPLETED",
        });
      });

      it("Logs processed messages", () => {
        expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_PROCESS_MESSAGE_SUCCESS",
          processedMessage: {
            sub: "mockSub",
            sentTimestamp: "mockSentTimestamp",
          },
        });
      });

      it("Returns no batchItemFailures", () => {
        expect(result).toStrictEqual({ batchItemFailures: [] });
      });
    });
  });
});

const mockInertCredentialResultRegistry: IDynamoDbAdapter = {
  putItem: jest.fn(() => {
    throw new Error("Not implemented");
  }),
};

const mockCredentialResultRegistrySuccess: IDynamoDbAdapter = {
  ...mockInertCredentialResultRegistry,
  putItem: jest.fn().mockResolvedValue(emptySuccess()),
};

const mockCredentialResultRegistryPutItemFailure: IDynamoDbAdapter = {
  ...mockInertCredentialResultRegistry,
  putItem: jest.fn().mockResolvedValue(emptyFailure()),
};
