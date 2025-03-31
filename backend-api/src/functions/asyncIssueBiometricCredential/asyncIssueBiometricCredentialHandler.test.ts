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
  let lambdaError: Error | undefined;

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
    describe("Given event is null or undefined", () => {
      const invalidSqsEvent = null as unknown as SQSEvent;
      beforeEach(async () => {
        try {
          await lambdaHandlerConstructor(
            dependencies,
            invalidSqsEvent,
            context,
          );
        } catch (error: unknown) {
          lambdaError = error as Error;
        }
      });

      it("logs INVALID_SQS_EVENT", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT",
          errorMessage: "Event is either null or undefined.",
        });
      });

      it("Throws error with message", () => {
        expect(lambdaError?.message).toEqual(
          "Invalid SQS event. Event is either null or undefined.",
        );
      });
    });

    describe("Given event is missing Records array", () => {
      const invalidSqsEvent = {} as unknown as SQSEvent;
      beforeEach(async () => {
        try {
          await lambdaHandlerConstructor(
            dependencies,
            invalidSqsEvent,
            context,
          );
        } catch (error: unknown) {
          lambdaError = error as Error;
        }
      });

      it("logs INVALID_SQS_EVENT", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT",
          errorMessage: "Invalid event structure: Missing 'Records' array.",
        });
      });

      it("Throws error with message", () => {
        expect(lambdaError?.message).toEqual(
          "Invalid SQS event. Invalid event structure: Missing 'Records' array.",
        );
      });
    });

    describe("Given there is not exactly one record", () => {
      const invalidSqsEvent = {
        Records: [],
      };
      beforeEach(async () => {
        try {
          await lambdaHandlerConstructor(
            dependencies,
            invalidSqsEvent,
            context,
          );
        } catch (error: unknown) {
          lambdaError = error as Error;
        }
      });

      it("Logs INVALID_SQS_EVENT", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT",
          errorMessage: "Expected exactly one record, got 0.",
        });
      });

      it("Throws error with message", () => {
        expect(lambdaError?.message).toEqual(
          "Invalid SQS event. Expected exactly one record, got 0.",
        );
      });
    });

    describe("Given event body is undefined", () => {
      const invalidSqsEvent = {
        Records: [
          {
            ...validVendorProcessingQueueSqsEventRecord,
            body: undefined,
          },
        ],
      } as unknown as SQSEvent;

      beforeEach(async () => {
        try {
          await lambdaHandlerConstructor(
            dependencies,
            invalidSqsEvent,
            context,
          );
        } catch (error: unknown) {
          lambdaError = error as Error;
        }
      });

      it("Logs INVALID_SQS_EVENT", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT",
          errorMessage: "Event body either null or undefined.",
        });
      });

      it("Throws error with message", () => {
        expect(lambdaError?.message).toEqual(
          "Invalid SQS event. Event body either null or undefined.",
        );
      });
    });

    describe("Given event body cannot be parsed", () => {
      const invalidSqsEvent = {
        Records: [
          {
            ...validVendorProcessingQueueSqsEventRecord,
            body: "invalidJson",
          },
        ],
      };

      beforeEach(async () => {
        try {
          await lambdaHandlerConstructor(
            dependencies,
            invalidSqsEvent,
            context,
          );
        } catch (error: unknown) {
          lambdaError = error as Error;
        }
      });

      it("Logs INVALID_SQS_EVENT", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT",
          errorMessage: "Failed to parse event body. Body: invalidJson",
        });
      });

      it("Throws error with message", () => {
        expect(lambdaError?.message).toEqual(
          "Invalid SQS event. Failed to parse event body. Body: invalidJson",
        );
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
        try {
          await lambdaHandlerConstructor(
            dependencies,
            invalidSqsEvent,
            context,
          );
        } catch (error: unknown) {
          lambdaError = error as Error;
        }
      });

      it("Logs INVALID_SQS_EVENT", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT",
          errorMessage:
            "sessionId in request body is not a valid v4 UUID. sessionId: mockInvalidSessionId",
        });
      });

      it("Throws error with message", () => {
        expect(lambdaError?.message).toEqual(
          "Invalid SQS event. sessionId in request body is not a valid v4 UUID. sessionId: mockInvalidSessionId",
        );
      });
    });
  });

  describe("Given the lambda handler receives an SQSEvent", () => {
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
