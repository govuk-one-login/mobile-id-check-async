import { Context, SQSEvent } from "aws-lambda";
import { expect } from "@jest/globals";
import "../../../tests/testUtils/matchers";
import { buildLambdaContext } from "../testUtils/mockContext";
import { logger } from "../common/logging/logger";
import { lambdaHandlerConstructor } from "./asyncIssueBiometricCredentialHandler";
import { RetainMessageOnQueue } from "./RetainMessageOnQueue";
import { IssueBiometricCredentialDependencies } from "./handlerDependencies";
import {
  mockBiometricSessionId,
  mockInertEventService,
  mockInertSessionRegistry,
  mockSessionId,
  mockSuccessfulEventService,
  validBiometricSessionFinishedAttributes,
  validResultSentAttributes,
} from "../testUtils/unitTestData";
import { SessionRegistry } from "../common/session/SessionRegistry/SessionRegistry";
import { emptyFailure, errorResult, successResult } from "../utils/result";
import { GetSessionError } from "../common/session/SessionRegistry/types";

describe("Async Issue Biometric Credential", () => {
  let dependencies: IssueBiometricCredentialDependencies;
  let context: Context;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let lambdaError: unknown;

  const mockGetSecretsSuccess = jest.fn().mockResolvedValue(
    successResult({
      mockBiometricViewerAccessKey: "mockViewerKey",
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

  const mockSessionRegistrySuccess: SessionRegistry = {
    ...mockInertSessionRegistry,
    getSession: jest
      .fn()
      .mockResolvedValue(
        successResult(validBiometricSessionFinishedAttributes),
      ),
  };

  beforeEach(() => {
    dependencies = {
      env: {
        BIOMETRIC_VIEWER_KEY_SECRET_PATH: "mockBiometricViewerAccessKey",
        BIOMETRIC_VIEWER_ACCESS_KEY_SECRET_CACHE_DURATION_IN_SECONDS: "900",
        SESSION_TABLE_NAME: "mockTableName",
        TXMA_SQS: "mockTxmaSqs",
        ISSUER: "mockIssuer",
      },
      getSessionRegistry: () => mockSessionRegistrySuccess,
      getSecrets: mockGetSecretsSuccess,
      getEventService: () => mockSuccessfulEventService,
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
      ["BIOMETRIC_VIEWER_KEY_SECRET_PATH"],
      ["BIOMETRIC_VIEWER_ACCESS_KEY_SECRET_CACHE_DURATION_IN_SECONDS"],
      ["SESSION_TABLE_NAME"],
      ["TXMA_SQS"],
      ["ISSUER"],
    ])("Given %s environment variable is missing", (envVar: string) => {
      beforeEach(async () => {
        delete dependencies.env[envVar];
        try {
          await lambdaHandlerConstructor(dependencies, validSqsEvent, context);
        } catch (error: unknown) {
          lambdaError = error;
        }
      });

      it("Logs INVALID_CONFIG", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_INVALID_CONFIG",
          data: {
            missingEnvironmentVariables: [envVar],
          },
        });
      });

      it("Throws RetainMessageOnQueue", async () => {
        expect(lambdaError).toStrictEqual(
          new RetainMessageOnQueue("Invalid config"),
        );
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

  describe("Get session failures", () => {
    describe("Given the error type is internal server error", () => {
      beforeEach(async () => {
        dependencies.getSessionRegistry = () => ({
          ...mockInertSessionRegistry,
          getSession: jest.fn().mockResolvedValue(
            errorResult({
              errorType: GetSessionError.INTERNAL_SERVER_ERROR,
            }),
          ),
        });
        try {
          await lambdaHandlerConstructor(dependencies, validSqsEvent, context);
        } catch (error: unknown) {
          lambdaError = error;
        }
      });

      it("Throws RetainMessageOnQueue", async () => {
        expect(lambdaError).toEqual(
          new RetainMessageOnQueue(
            "Unexpected failure retrieving session from database",
          ),
        );
      });
    });

    describe("Given the error type is a client error", () => {
      describe("Given writing TxMA event fails", () => {
        beforeEach(async () => {
          dependencies.getSessionRegistry = () => ({
            ...mockInertSessionRegistry,
            getSession: jest.fn().mockResolvedValue(
              errorResult({
                errorType: GetSessionError.CLIENT_ERROR,
              }),
            ),
          });
          dependencies.getEventService = () => ({
            ...mockInertEventService,
            writeGenericEvent: jest.fn().mockResolvedValue(
              errorResult({
                errorMessage: "mockError",
              }),
            ),
          });

          await lambdaHandlerConstructor(dependencies, validSqsEvent, context);
        });

        it("Logs DCMAW_ASYNC_CRI_5XXERROR audit event error", () => {
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_ERROR_WRITING_AUDIT_EVENT",
            data: { auditEventName: "DCMAW_ASYNC_CRI_5XXERROR" },
          });
        });

        it("Does not log COMPLETED", () => {
          expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
          });
        });
      });

      describe("Given writing TxMA event succeeds", () => {
        beforeEach(async () => {
          dependencies.getSessionRegistry = () => ({
            ...mockInertSessionRegistry,
            getSession: jest.fn().mockResolvedValue(
              errorResult({
                errorType: GetSessionError.CLIENT_ERROR,
              }),
            ),
          });

          await lambdaHandlerConstructor(dependencies, validSqsEvent, context);
        });

        it("Writes DCMAW_ASYNC_CRI_5XXERROR to TxMA", () => {
          expect(mockSuccessfulEventService.writeGenericEvent).toBeCalledWith({
            eventName: "DCMAW_ASYNC_CRI_5XXERROR",
            componentId: "mockIssuer",
            getNowInMilliseconds: Date.now,
            sessionId: mockSessionId,
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
    beforeEach(async () => {
      dependencies.getSecrets = jest.fn().mockResolvedValue(emptyFailure());
      try {
        await lambdaHandlerConstructor(dependencies, validSqsEvent, context);
      } catch (error: unknown) {
        lambdaError = error;
      }
    });

    it("Throws RetainMessageOnQueue", async () => {
      expect(lambdaError).toStrictEqual(
        new RetainMessageOnQueue("Failed to retrieve biometric viewer key"),
      );
    });
  });

  describe("Given the lambda handler reads a valid SQSEvent", () => {
    describe("Given sessionState is ASYNC_RESULT_SENT", () => {
      beforeEach(async () => {
        dependencies.getSessionRegistry = () => ({
          ...mockInertSessionRegistry,
          getSession: jest
            .fn()
            .mockResolvedValue(successResult(validResultSentAttributes)),
        });
        await lambdaHandlerConstructor(dependencies, validSqsEvent, context);
      });

      it("Does not make a call to get secrets", () => {
        expect(mockGetSecretsSuccess).not.toHaveBeenCalled();
      });

      it("Logs COMPLETED with sessionId", async () => {
        expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
          sessionId: mockSessionId,
        });
      });
    });

    describe("Given sessionState is ASYNC_BIOMETRIC_SESSION_FINISHED", () => {
      beforeEach(async () => {
        await lambdaHandlerConstructor(dependencies, validSqsEvent, context);
      });

      it("Passes correct arguments to get secrets", () => {
        expect(mockGetSecretsSuccess).toHaveBeenCalledWith({
          secretNames: ["mockBiometricViewerAccessKey"],
          cacheDurationInSeconds: 900,
        });
      });

      it("Logs COMPLETED with sessionId", async () => {
        expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
          sessionId: mockSessionId,
        });
      });
    });
  });
});
