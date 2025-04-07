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
    describe("Given credential result is missing a subjectIdentifier", () => {
      let result: SQSBatchResponse;

      beforeEach(async () => {
        const event: SQSEvent = {
          Records: [failingSQSRecordBodyMissingSub],
        };
        result = await lambdaHandlerConstructor(dependencies, event, context);
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
          Records: [validSQSRecord],
        };
        await lambdaHandlerConstructor(dependencies, event, context);
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
              subjectIdentifier: "mockSubjectIdentifier",
              timestamp: "mockTimestamp",
            },
          ],
        });
      });
    });
  });
});
