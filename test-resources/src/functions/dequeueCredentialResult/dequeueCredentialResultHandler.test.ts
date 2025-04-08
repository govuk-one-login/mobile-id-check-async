import { expect } from "@jest/globals";
import { Context, SQSBatchResponse, SQSEvent } from "aws-lambda";
import "aws-sdk-client-mock-jest";
import { logger } from "../common/logging/logger";
import "../testUtils/matchers";
import { buildLambdaContext } from "../testUtils/mockContext";
import {
  IDequeueCredentialResultDependencies,
  lambdaHandlerConstructor,
} from "./dequeueCredentialResultHandler";
import { failingSQSRecordBodyMissingSub, validSQSRecord } from "./unitTestData";

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

  describe("Given the records array is empty", () => {
    let result: SQSBatchResponse;

    beforeEach(async () => {
      const event: SQSEvent = {
        Records: [],
      };
      result = await lambdaHandlerConstructor(dependencies, event, context);
    });

    it("Logs an empty array", () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        processedMessages: [],
      });
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
    let result: SQSBatchResponse;

    beforeEach(async () => {
      const event: SQSEvent = {
        Records: [failingSQSRecordBodyMissingSub],
      };
      result = await lambdaHandlerConstructor(dependencies, event, context);
    });

    it("Logs an error message", () => {
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        messageCode: "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_INVALID_RESULT",
      });

      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        message: "Credential result is missing or invalid",
      });

      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        errorMessage: "sub is missing from credential result.",
      });
    });

    it("Returns no batchItemFailures", () => {
      expect(result).toStrictEqual({ batchItemFailures: [] });
    });
  });

  describe("Given the Lambda receives at least one valid credential result", () => {
    describe("Given the Lambda receives one message to be processed", () => {
      let result: SQSBatchResponse;

      beforeEach(async () => {
        const event: SQSEvent = {
          Records: [validSQSRecord],
        };
        result = await lambdaHandlerConstructor(dependencies, event, context);
      });

      it("Logs COMPLETED", async () => {
        expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
          messageCode: "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_COMPLETED",
        });
      });

      it("Logs processed messages", () => {
        expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
          processedMessages: [
            {
              sub: "mockSub",
              timestamp: "mockTimestamp",
            },
          ],
        });
      });

      it("Returns no batchItemFailures", () => {
        expect(result).toStrictEqual({ batchItemFailures: [] });
      });
    });
  });

  describe("Given the Lambda receives multiple messages to be processed", () => {
    let result: SQSBatchResponse;

    beforeEach(async () => {
      const event: SQSEvent = {
        Records: [failingSQSRecordBodyMissingSub, validSQSRecord],
      };
      result = await lambdaHandlerConstructor(dependencies, event, context);
    });

    it("Logs an error message", () => {
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        messageCode: "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_INVALID_RESULT",
      });

      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        message: "Credential result is missing or invalid",
      });

      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        errorMessage: "sub is missing from credential result.",
      });
    });

    it("Logs COMPLETED", async () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_COMPLETED",
      });
    });

    it("Logs processed messages", () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        processedMessages: [
          {
            sub: "mockSub",
            timestamp: "mockTimestamp",
          },
        ],
      });
    });

    it("Returns no batchItemFailures", () => {
      expect(result).toStrictEqual({ batchItemFailures: [] });
    });
  });
});
