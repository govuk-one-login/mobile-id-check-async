import { Context, SQSEvent } from "aws-lambda";
import { expect } from "@jest/globals";
import "../../../tests/testUtils/matchers";
import { buildLambdaContext } from "../testUtils/mockContext";
import { logger } from "../common/logging/logger";
import { lambdaHandlerConstructor } from "./asyncIssueBiometricCredentialHandler";
import { IssueBiometricCredentialDependencies } from "./handlerDependencies";
import {
  mockBiometricSessionId,
  mockSessionId,
} from "../testUtils/unitTestData";

describe("Async Issue Biometric Credential", () => {
  let dependencies: IssueBiometricCredentialDependencies;
  let context: Context;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  const validVendorProcessingQueueSqsEventRecord = {
    messageId: "mockMessageId",
    receiptHandle: "mockReceiptHandle",
    body: JSON.stringify({
      biometricSessionId: mockBiometricSessionId,
      sessionId: mockSessionId,
    }),
    attributes: {
      ApproximateReceiveCount: "mockApproximateReceiveCount",
      SentTimestamp: "mockSentTimestamp",
      SenderId: "mockSenderId",
      ApproximateFirstReceiveTimestamp: "mockApproximateFirstReceiveTimestamp",
    },
    messageAttributes: {},
    md5OfBody: "mockMd5OfBody",
    eventSource: "mockEventSource",
    eventSourceARN: "mockEventSourceArn",
    awsRegion: "mockAwsRegion",
  };

  const validSqsEvent: SQSEvent = {
    Records: [validVendorProcessingQueueSqsEventRecord],
  };

  beforeEach(() => {
    dependencies = {
      env: {},
    };
    context = buildLambdaContext();
    consoleInfoSpy = jest.spyOn(console, "info");
    consoleErrorSpy = jest.spyOn(console, "error");
  });

  describe("On every invocation", () => {
    beforeEach(async () => {
      await lambdaHandlerConstructor(dependencies, validSqsEvent, context);
    });

    it("Adds context and version to log attributes and logs STARTED message", () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_STARTED",
        functionVersion: "1",
        function_arn: "arn:12345",
      });
    });

    it("Clears pre-existing log attributes", async () => {
      logger.appendKeys({ testKey: "testValue" });
      await lambdaHandlerConstructor(dependencies, validSqsEvent, context);

      expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
        testKey: "testValue",
      });
    });
  });

  describe("SQS Event validation", () => {
    describe("Given event is invalid", () => {
      describe.each([
        {
          scenario: "Given event is null or undefined",
          invalidSqsEvent: null as unknown as SQSEvent,
          errorMessage: "Event is either null or undefined.",
        },
        {
          scenario: "Given event is missing Records array",
          invalidSqsEvent: {} as unknown as SQSEvent,
          errorMessage: "Invalid event structure: Missing 'Records' array.",
        },
        {
          scenario: "Given there is not exactly one record",
          invalidSqsEvent: {
            Records: [],
          },
          errorMessage: "Expected exactly one record, got 0.",
        },
      ])("$scenario", ({ invalidSqsEvent, errorMessage }) => {
        beforeEach(async () => {
          await lambdaHandlerConstructor(
            dependencies,
            invalidSqsEvent,
            context,
          );
        });

        it("Logs INVALID_SQS_EVENT", () => {
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode:
              "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT",
            errorMessage,
          });
        });

        it("Does not log COMPLETED", () => {
          expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
          });
        });
      });
    });

    describe("Given event body is invalid", () => {
      describe.each([
        {
          scenario: "Given event body is undefined",
          body: undefined,
          errorMessage: "Event body either null or undefined.",
        },
        {
          scenario: "Given event body cannot be parsed",
          body: "invalidJson",
          errorMessage: "Failed to parse event body. Body: invalidJson",
        },
      ])("$scenario", ({ body, errorMessage }) => {
        const invalidSqsEvent = {
          Records: [
            {
              ...validVendorProcessingQueueSqsEventRecord,
              body,
            },
          ],
        } as unknown as SQSEvent;
        beforeEach(async () => {
          await lambdaHandlerConstructor(
            dependencies,
            invalidSqsEvent,
            context,
          );
        });

        it("Logs INVALID_SQS_EVENT", () => {
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode:
              "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT",
            errorMessage,
          });
        });

        it("Does not log COMPLETED", () => {
          expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
          });
        });
      });
    });

    describe("Given parsed body is not in a valid shape", () => {
      describe.each([
        {
          scenario: "Given parsed body is null",
          parsedBody: JSON.stringify(null),
        },
        {
          scenario: "Given parsed body is an array",
          parsedBody: JSON.stringify([]),
        },
        {
          scenario: "Given parsed body is an empty object",
          parsedBody: JSON.stringify({}),
        },
        {
          scenario:
            "Given parsed body does not contain a key of sessionId with a value of type string",
          parsedBody: JSON.stringify({ foo: "bar" }),
        },
      ])("$scenario", ({ parsedBody }) => {
        const invalidSqsEvent = {
          Records: [
            {
              ...validVendorProcessingQueueSqsEventRecord,
              body: parsedBody,
            },
          ],
        };

        beforeEach(async () => {
          await lambdaHandlerConstructor(
            dependencies,
            invalidSqsEvent,
            context,
          );
        });

        it("Logs INVALID_SQS_EVENT", () => {
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode:
              "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT",
            errorMessage: `Parsed body not in expected shape: ${parsedBody}`,
          });
        });

        it("Does not log COMPLETED", () => {
          expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
          });
        });
      });
    });

    describe("Given sessionId in event body is invalid", () => {
      const invalidSqsEvent = {
        Records: [
          {
            ...validVendorProcessingQueueSqsEventRecord,
            body: JSON.stringify({
              sessionId: "mockInvalidSessionId",
              biometricSessionId: "mockBiometricSessionId",
            }),
          },
        ],
      };

      beforeEach(async () => {
        await lambdaHandlerConstructor(dependencies, invalidSqsEvent, context);
      });

      it("Logs INVALID_SQS_EVENT", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT",
          errorMessage:
            "sessionId in request body is not a valid v4 UUID. sessionId: mockInvalidSessionId",
        });
      });

      it("Does not log COMPLETED", () => {
        expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
        });
      });
    });
  });

  describe("Given the lambda handler receives a valid SQSEvent", () => {
    beforeEach(async () => {
      await lambdaHandlerConstructor(dependencies, validSqsEvent, context);
    });

    it("Logs COMPLETED", async () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
      });
    });
  });
});
