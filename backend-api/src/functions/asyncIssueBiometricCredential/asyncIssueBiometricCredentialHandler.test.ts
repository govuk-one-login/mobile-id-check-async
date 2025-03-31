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
    describe("Given event is null or undefined", () => {
      const invalidSqsEvent = null as unknown as SQSEvent;
      beforeEach(async () => {
        await lambdaHandlerConstructor(dependencies, invalidSqsEvent, context);
      });

      it("logs INVALID_SQS_EVENT", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT",
          errorMessage: "Event is either null or undefined.",
        });
      });

      it("Does not log COMPLETED", () => {
        expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
        });
      });
    });

    describe("Given event is missing Records array", () => {
      const invalidSqsEvent = {} as unknown as SQSEvent;
      beforeEach(async () => {
        await lambdaHandlerConstructor(dependencies, invalidSqsEvent, context);
      });

      it("logs INVALID_SQS_EVENT", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT",
          errorMessage: "Invalid event structure: Missing 'Records' array.",
        });
      });

      it("Does not log COMPLETED", () => {
        expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
        });
      });
    });

    describe("Given there is not exactly one record", () => {
      const invalidSqsEvent = {
        Records: [],
      };
      beforeEach(async () => {
        await lambdaHandlerConstructor(dependencies, invalidSqsEvent, context);
      });

      it("Logs INVALID_SQS_EVENT", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT",
          errorMessage: "Expected exactly one record, got 0.",
        });
      });

      it("Does not log COMPLETED", () => {
        expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
        });
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
        await lambdaHandlerConstructor(dependencies, invalidSqsEvent, context);
      });

      it("Logs INVALID_SQS_EVENT", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT",
          errorMessage: "Event body either null or undefined.",
        });
      });

      it("Does not log COMPLETED", () => {
        expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
        });
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
        await lambdaHandlerConstructor(dependencies, invalidSqsEvent, context);
      });

      it("Logs INVALID_SQS_EVENT", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT",
          errorMessage: "Failed to parse event body. Body: invalidJson",
        });
      });

      it("Does not log COMPLETED", () => {
        expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
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
