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
import { successResult, emptyFailure } from "../utils/result";

describe("Async Issue Biometric Credential", () => {
  let dependencies: IssueBiometricCredentialDependencies;
  let context: Context;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  const mockGetSecretsSuccess = jest.fn().mockResolvedValue(
    successResult({
      mock_biometric_viewer_access_key: "mockViewerKey",
    }),
  );

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
      env: {
        BIOMETRIC_VIEWER_ACCESS_KEY: "mockBiometricViewerAccessKey",
        BIOMETRIC_VIEWER_ACCESS_KEY_SECRET_CACHE_DURATION_IN_SECONDS: "900",
      },
      getSecrets: mockGetSecretsSuccess,
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

  describe("Config validation", () => {
    describe.each([
      ["BIOMETRIC_VIEWER_ACCESS_KEY"],
      ["BIOMETRIC_VIEWER_ACCESS_KEY_SECRET_CACHE_DURATION_IN_SECONDS"],
    ])("Given %s environment variable is missing", (envVar: string) => {
      it("Logs INVALID_CONFIG error and throws an error", async () => {
        delete dependencies.env[envVar];

        await expect(
          lambdaHandlerConstructor(dependencies, validSqsEvent, context),
        ).rejects.toThrow("Failed to get configuration");

        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_INVALID_CONFIG",
        });
      });
    });
  });

  describe("SQS Event validation", () => {
    describe("Given event does not contain exactly 1 record", () => {
      describe.each([
        {
          scenario: "Given there are 0 records",
          invalidSqsEvent: {
            Records: [],
          },
          errorMessage: "Expected exactly one record, got 0.",
        },
        {
          scenario: "Given there more than 1 record",
          invalidSqsEvent: {
            Records: [
              validVendorProcessingQueueSqsEventRecord,
              validVendorProcessingQueueSqsEventRecord,
            ],
          },
          errorMessage: "Expected exactly one record, got 2.",
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
          scenario: "Given body cannot be parsed",
          body: "invalidJson",
          errorMessage: "Failed to parse event body. Body: invalidJson",
        },
        {
          scenario: "Given parsed body is null",
          body: JSON.stringify(null),
          errorMessage: `Parsed event body not in expected shape. Parsed event body: null`,
        },
        {
          scenario: "Given parsed body is an array",
          body: JSON.stringify([]),
          errorMessage: `Parsed event body not in expected shape. Parsed event body: []`,
        },
        {
          scenario: "Given parsed body is an empty object",
          body: JSON.stringify({}),
          errorMessage: `Parsed event body not in expected shape. Parsed event body: {}`,
        },
        {
          scenario:
            "Given parsed body does not contain a key of sessionId with a value of type string",
          body: JSON.stringify({ foo: "bar" }),
          errorMessage: `Parsed event body not in expected shape. Parsed event body: {"foo":"bar"}`,
        },
        {
          scenario: "Given sessionId in event body is invalid",
          body: JSON.stringify({
            sessionId: "mockInvalidSessionId",
            biometricSessionId: "mockBiometricSessionId",
          }),
          errorMessage:
            "sessionId in request body is not a valid v4 UUID. sessionId: mockInvalidSessionId",
        },
      ])("$scenario", ({ body, errorMessage }) => {
        const invalidSqsEvent = {
          Records: [
            {
              ...validVendorProcessingQueueSqsEventRecord,
              body,
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
  });

  describe("When there is an error getting secrets", () => {
    beforeEach(() => {
      dependencies.getSecrets = jest.fn().mockResolvedValue(emptyFailure());
    });

    it("Logs ERROR_RETRIEVING_BIOMETRIC_VIEWER_KEY and throws an error", async () => {
      await expect(
        lambdaHandlerConstructor(dependencies, validSqsEvent, context),
      ).rejects.toThrow("Failed to retrieve biometric viewer key");

      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_ERROR_RETRIEVING_BIOMETRIC_VIEWER_KEY",
      });
    });
  });

  describe("Given the lambda handler reads a valid SQSEvent", () => {
    beforeEach(async () => {
      await lambdaHandlerConstructor(dependencies, validSqsEvent, context);
    });

    it("Logs COMPLETED with sessionId", async () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
        sessionId: mockSessionId,
      });
    });

    it("Passes correct arguments to get secrets", () => {
      expect(mockGetSecretsSuccess).toHaveBeenCalledWith({
        secretNames: ["mock_biometric_viewer_access_key"],
        cacheDurationInSeconds: 900,
      });
    });
  });
});
