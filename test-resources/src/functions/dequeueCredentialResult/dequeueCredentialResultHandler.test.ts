import { expect } from "@jest/globals";
import { Context, SQSBatchResponse, SQSEvent } from "aws-lambda";
import "aws-sdk-client-mock-jest";
import { logger } from "../common/logging/logger";
import { emptyFailure, emptySuccess } from "../common/utils/result";
import "../testUtils/matchers";
import { buildLambdaContext } from "../testUtils/mockContext";
import { lambdaHandlerConstructor } from "./dequeueCredentialResultHandler";
import { failingSQSRecordBodyMissingSub, validSQSRecord } from "./unitTestData";
import { IDequeueCredentialResultDependencies } from "./handlerDependencies";
import { IDequeueDynamoDbAdapter } from "../common/dequeueDynamoDbAdapter/dequeueDynamoDbAdapter";

describe("Dequeue credential result", () => {
  let dependencies: IDequeueCredentialResultDependencies;
  let context: Context;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let result: SQSBatchResponse;

  beforeEach(() => {
    dependencies = {
      env: {
        CREDENTIAL_RESULT_TTL_DURATION_IN_SECONDS: "3600",
        CREDENTIAL_RESULT_TABLE_NAME: "mockCredentialResultsTableName",
      },
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

      it("Logs INVALID_CONFIG", async () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_INVALID_CONFIG",
          data: {
            missingEnvironmentVariables: [envVar],
          },
        });
      });

      it("Returns empty batchItemFailures", async () => {
        expect(result).toStrictEqual({
          batchItemFailures: [],
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
        batchItemFailures: [],
      });
    });

    it("Returns empty batchItemFailures", () => {
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

    it("Returns empty batchItemFailures", () => {
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
            batchItemFailures: [
              { itemIdentifier: "c2098377-619a-449f-b2b4-254b6c41aff4" },
            ],
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

        it("Logs dequeue message success", () => {
          expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
            messageCode:
              "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_DEQUEUE_MESSAGE_SUCCESS",
            processedMessage: {
              sub: "mockSub",
              sentTimestamp: "mockSentTimestamp",
            },
          });
        });

        it("Logs COMPLETED", () => {
          expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
            messageCode: "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_COMPLETED",
            batchItemFailures: [],
          });
        });

        it("Returns empty batchItemFailures", () => {
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

      it("Logs dequeue message success", () => {
        expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_DEQUEUE_MESSAGE_SUCCESS",
          processedMessage: {
            sub: "mockSub",
            sentTimestamp: "mockSentTimestamp",
          },
        });
      });

      it("Logs COMPLETED", () => {
        expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
          messageCode: "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_COMPLETED",
          batchItemFailures: [],
        });
      });

      it("Returns empty batchItemFailures", () => {
        expect(result).toStrictEqual({ batchItemFailures: [] });
      });
    });

    describe("Given there are multiple messages for the same sub", () => {
      beforeEach(async () => {
        const validSQSRecord2 = {
          ...validSQSRecord,
          attributes: {
            ...validSQSRecord.attributes,
            SentTimestamp: "mockSentTimestamp2",
          },
        };
        const event: SQSEvent = {
          Records: [validSQSRecord, validSQSRecord2],
        };
        result = await lambdaHandlerConstructor(dependencies, event, context);
      });

      it("Logs dequeue message success", () => {
        expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_DEQUEUE_MESSAGE_SUCCESS",
          processedMessage: {
            sub: "mockSub",
            sentTimestamp: "mockSentTimestamp",
          },
        });
      });

      it("Logs dequeue message success after receiving another message for the same sub", () => {
        expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_DEQUEUE_MESSAGE_SUCCESS",
          processedMessage: {
            sub: "mockSub",
            sentTimestamp: "mockSentTimestamp2",
          },
        });
      });

      it("Logs COMPLETED", () => {
        expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
          messageCode: "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_COMPLETED",
          batchItemFailures: [],
        });
      });

      it("Returns empty batchItemFailures", () => {
        expect(result).toStrictEqual({ batchItemFailures: [] });
      });
    });
  });
});

const mockCredentialResultRegistrySuccess: IDequeueDynamoDbAdapter = {
  putItem: jest.fn().mockResolvedValue(emptySuccess()),
};

const mockCredentialResultRegistryPutItemFailure: IDequeueDynamoDbAdapter = {
  putItem: jest.fn().mockResolvedValue(emptyFailure()),
};
