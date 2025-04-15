import { Context, SQSEvent } from "aws-lambda";
import { expect } from "@jest/globals";
import "../../../tests/testUtils/matchers";
import { buildLambdaContext } from "../testUtils/mockContext";
import { logger } from "../common/logging/logger";
import { lambdaHandlerConstructor } from "./asyncIssueBiometricCredentialHandler";
import { IssueBiometricCredentialDependencies } from "./handlerDependencies";
import {
  mockSessionId,
  mockSuccessfulEventService,
  mockWriteGenericEventSuccessResult,
  mockSuccessfulSendMessageToSqs,
  mockInertSessionRegistry,
  validBiometricTokenIssuedSessionAttributes,
  mockBiometricSessionId,
} from "../testUtils/unitTestData";
import { successResult, emptyFailure } from "../utils/result";
import { BiometricSession } from "./getBiometricSession/getBiometricSession";

// Mock the isRetryableError and getLastError functions
jest.mock("./getBiometricSession/getBiometricSession", () => {
  return {
    ...jest.requireActual("./getBiometricSession/getBiometricSession"),
    isRetryableError: jest.fn(),
    getLastError: jest.fn(),
  };
});

import {
  isRetryableError,
  getLastError,
} from "./getBiometricSession/getBiometricSession";

describe("Async Issue Biometric Credential", () => {
  let dependencies: IssueBiometricCredentialDependencies;
  let context: Context;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  // Mock sessions for testing
  const mockReadyBiometricSession: BiometricSession = {
    id: "mockBiometricSessionId",
    finish: "DONE",
  };

  const mockNotReadyBiometricSession: BiometricSession = {
    id: "mockBiometricSessionId",
    finish: "PROCESSING",
  };

  // Mock functions for biometric session retrieval
  const mockGetBiometricSessionSuccess = jest
    .fn()
    .mockResolvedValue(successResult(mockReadyBiometricSession));

  const mockGetBiometricSessionNotReady = jest
    .fn()
    .mockResolvedValue(successResult(mockNotReadyBiometricSession));

  const mockGetBiometricSessionFailure = jest
    .fn()
    .mockResolvedValue(emptyFailure());

  const mockGetSecretsSuccess = jest.fn().mockResolvedValue(
    successResult({
      mockBiometricViewerAccessKey: "mockViewerKey",
    }),
  );

  const mockSessionRegistrySuccess = {
    ...mockInertSessionRegistry,
    getSession: jest
      .fn()
      .mockResolvedValue(
        successResult(validBiometricTokenIssuedSessionAttributes),
      ),
  };

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
        BIOMETRIC_VIEWER_KEY_SECRET_PATH: "mockBiometricViewerAccessKey",
        BIOMETRIC_VIEWER_ACCESS_KEY_SECRET_CACHE_DURATION_IN_SECONDS: "900",
        READID_BASE_URL: "mockReadIdBaseUrl",
        IPVCORE_OUTBOUND_SQS: "mockIpvcoreOutboundSqs",
        SESSION_TABLE_NAME: "mockTableName",
        TXMA_SQS: "mockTxmaSqs",
        ISSUER: "mockIssuer",
      },
      getSecrets: mockGetSecretsSuccess,
      getBiometricSession: mockGetBiometricSessionSuccess,
      getSessionRegistry: () => mockSessionRegistrySuccess,
      getEventService: () => mockSuccessfulEventService,
      sendMessageToSqs: mockSuccessfulSendMessageToSqs,
    };
    context = buildLambdaContext();
    consoleInfoSpy = jest.spyOn(console, "info");
    consoleErrorSpy = jest.spyOn(console, "error");

    // Reset mocks
    (isRetryableError as jest.Mock).mockReset();
    (getLastError as jest.Mock).mockReset();
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
      ["READID_BASE_URL"],
      ["IPVCORE_OUTBOUND_SQS"],
      ["SESSION_TABLE_NAME"],
      ["TXMA_SQS"],
      ["ISSUER"],
    ])("Given %s environment variable is missing", (envVar: string) => {
      beforeEach(() => {
        delete dependencies.env[envVar];
      });

      it("logs INVALID_CONFIG and throws error", async () => {
        await expect(
          lambdaHandlerConstructor(dependencies, validSqsEvent, context),
        ).rejects.toThrow("Invalid config");

        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_INVALID_CONFIG",
          data: {
            missingEnvironmentVariables: [envVar],
          },
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
    beforeEach(async () => {
      dependencies.getSecrets = jest.fn().mockResolvedValue(emptyFailure());
    });

    it("Throws RetainMessageOnQueue", async () => {
      await expect(
        lambdaHandlerConstructor(dependencies, validSqsEvent, context),
      ).rejects.toThrow("Failed to retrieve biometric viewer key");
    });
  });

  describe("When biometric session is not ready", () => {
    beforeEach(() => {
      dependencies.getBiometricSession = mockGetBiometricSessionNotReady;
    });

    it("Throws RetainMessageOnQueue with appropriate message", async () => {
      await expect(
        lambdaHandlerConstructor(dependencies, validSqsEvent, context),
      ).rejects.toThrow(/Biometric session not ready: PROCESSING/);

      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_BIOMETRIC_SESSION_NOT_READY",
        data: {
          finish: "PROCESSING",
        },
      });
    });
  });

  describe("When biometric session retrieval fails", () => {
    beforeEach(() => {
      dependencies.getBiometricSession = mockGetBiometricSessionFailure;
    });

    describe("With retryable error", () => {
      beforeEach(() => {
        (isRetryableError as jest.Mock).mockReturnValue(true);
        (getLastError as jest.Mock).mockReturnValue({
          statusCode: 503,
          message: "Service Unavailable",
        });
      });

      it("Throws RetainMessageOnQueue with appropriate message", async () => {
        await expect(
          lambdaHandlerConstructor(dependencies, validSqsEvent, context),
        ).rejects.toThrow(/Retryable error/);

        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_BIOMETRIC_SESSION_RETRYABLE_ERROR",
        });
      });
    });

    describe("With non-retryable error", () => {
      beforeEach(() => {
        (isRetryableError as jest.Mock).mockReturnValue(false);
        (getLastError as jest.Mock).mockReturnValue({
          statusCode: 404,
          message: "Not Found",
        });
      });

      it("Logs error and sends error to IPV Core", async () => {
        await lambdaHandlerConstructor(dependencies, validSqsEvent, context);

        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_BIOMETRIC_SESSION_NON_RETRYABLE_ERROR",
        });

        expect(mockSuccessfulSendMessageToSqs).toHaveBeenCalledWith(
          "mockIpvcoreOutboundSqs",
          {
            sub: expect.any(String),
            state: expect.any(String),
            error: "server_error",
            error_description:
              "Failed to retrieve biometric session from ReadID",
          },
        );
      });

      it("Sends event to TxMA", async () => {
        await lambdaHandlerConstructor(dependencies, validSqsEvent, context);

        expect(mockWriteGenericEventSuccessResult).toHaveBeenCalledWith(
          expect.objectContaining({
            eventName: "DCMAW_ASYNC_CRI_5XXERROR",
            componentId: "mockIssuer",
          }),
        );
      });

      describe("When sending error to IPV Core fails", () => {
        beforeEach(() => {
          dependencies.sendMessageToSqs = jest
            .fn()
            .mockResolvedValue(emptyFailure());
        });

        it("Still sends event to TxMA", async () => {
          await lambdaHandlerConstructor(dependencies, validSqsEvent, context);

          expect(mockWriteGenericEventSuccessResult).toHaveBeenCalled();
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode:
              "MOBILE_ASYNC_BIOMETRIC_SESSION_IPV_CORE_MESSAGE_ERROR",
          });
        });
      });

      // describe("When sending event to TxMA fails", () => {
      //   beforeEach(() => {
      //     dependencies.getEventService = () => ({
      //       writeGenericEvent: jest.fn().mockResolvedValue(emptyFailure()),
      //     });
      //   });

      //   it("Logs the error", async () => {
      //     await lambdaHandlerConstructor(dependencies, validSqsEvent, context);

      //     expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
      //       messageCode: "MOBILE_ASYNC_BIOMETRIC_SESSION_TXMA_EVENT_ERROR",
      //     });
      //   });
      // });
    });
  });

  describe("When session not found", () => {
    beforeEach(() => {
      dependencies.getSessionRegistry = () => ({
        ...mockInertSessionRegistry,
        getSession: jest.fn().mockResolvedValue(emptyFailure()),
      });
    });

    it("Logs warning but continues processing", async () => {
      await lambdaHandlerConstructor(dependencies, validSqsEvent, context);

      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_SESSION_NOT_FOUND",
        data: { sessionId: mockSessionId },
      });

      // Should still continue to call getBiometricSession
      expect(mockGetBiometricSessionSuccess).toHaveBeenCalled();
    });

    describe("And biometric session retrieval fails with non-retryable error", () => {
      beforeEach(() => {
        dependencies.getBiometricSession = mockGetBiometricSessionFailure;
        (isRetryableError as jest.Mock).mockReturnValue(false);
      });

      it("Handles error without session attributes", async () => {
        await lambdaHandlerConstructor(dependencies, validSqsEvent, context);

        // Should still send event to TxMA, but without subject identifier
        expect(mockWriteGenericEventSuccessResult).toHaveBeenCalledWith(
          expect.objectContaining({
            eventName: "DCMAW_ASYNC_CRI_5XXERROR",
            sessionId: mockSessionId,
            sub: undefined,
          }),
        );
      });
    });
  });

  describe("When Biometric session is ready", () => {
    beforeEach(async () => {
      await lambdaHandlerConstructor(dependencies, validSqsEvent, context);
    });

    it("Passes correct arguments to get secrets", () => {
      expect(mockGetSecretsSuccess).toHaveBeenCalledWith({
        secretNames: ["mockBiometricViewerAccessKey"],
        cacheDurationInSeconds: 900,
      });
    });

    it("Passes correct arguments to get biometric session", () => {
      expect(mockGetBiometricSessionSuccess).toHaveBeenCalledWith(
        "mockReadIdBaseUrl",
        mockSessionId,
        "mockViewerKey",
      );
    });

    it("Logs COMPLETED with sessionId", async () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
        sessionId: mockSessionId,
      });
    });
  });
});
