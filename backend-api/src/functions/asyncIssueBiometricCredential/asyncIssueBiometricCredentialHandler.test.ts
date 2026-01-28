import { Advisory } from "@govuk-one-login/mobile-id-check-biometric-credential";
import { expect } from "@jest/globals";
import { Context, SQSEvent } from "aws-lambda";
import "../../../tests/testUtils/matchers";
import { logger } from "../common/logging/logger";
import { SessionRegistry } from "../common/session/SessionRegistry/SessionRegistry";
import {
  GetSessionError,
  UpdateSessionError,
} from "../common/session/SessionRegistry/types";
import { buildLambdaContext } from "../testUtils/mockContext";
import {
  mockAnalyticsData,
  mockAuditData,
  mockBiometricCredential,
  mockBiometricSessionId,
  mockClientState,
  mockCredentialSubject,
  mockFailingCriEventService,
  mockFailingEventService,
  mockGovukSigninJourneyId,
  mockInertEventService,
  mockInertSessionRegistry,
  mockIssuer,
  mockSendMessageToSqsFailure,
  mockSendMessageToSqsSuccess,
  mockSessionId,
  mockSqsInboundMessageId,
  mockSqsResponseMessageId,
  mockSubjectIdentifier,
  mockSuccessfulEventService,
  mockWriteGenericEventSuccessResult,
  NOW_IN_MILLISECONDS,
  ONE_HOUR_AGO_IN_MILLISECONDS,
  validBiometricSessionFinishedAttributes,
  validResultSentAttributes,
} from "../testUtils/unitTestData";
import { emptyFailure, errorResult, successResult } from "../utils/result";
import { lambdaHandlerConstructor } from "./asyncIssueBiometricCredentialHandler";
import {
  BiometricSession,
  GetBiometricSessionError,
} from "./getBiometricSession/getBiometricSession";
import { IssueBiometricCredentialDependencies } from "./handlerDependencies";
import { RetainMessageOnQueue } from "./RetainMessageOnQueue";
import { getCredentialFromBiometricSessionLogger } from "./getCredentialFromBiometricSessionLogger";

jest.mock("crypto", () => ({
  ...jest.requireActual("crypto"),
  randomUUID: () => "mock_random_uuid",
}));

describe("Async Issue Biometric Credential", () => {
  let dependencies: IssueBiometricCredentialDependencies;
  let context: Context;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let lambdaError: unknown;
  const expectedErrorTxmaEventName = "DCMAW_ASYNC_CRI_ERROR";

  const mockReadyBiometricSession: BiometricSession = {
    finish: "DONE",
  };

  const mockNotReadyBiometricSession: BiometricSession = {
    finish: "PROCESSING",
  };

  const mockGetSessionSuccess = jest
    .fn()
    .mockResolvedValue(successResult(validBiometricSessionFinishedAttributes));

  const mockGetBiometricSessionSuccess = jest
    .fn()
    .mockResolvedValue(successResult(mockReadyBiometricSession));

  const mockGetBiometricSessionNotReady = jest
    .fn()
    .mockResolvedValue(successResult(mockNotReadyBiometricSession));

  const mockRetryableError: GetBiometricSessionError = {
    isRetryable: true,
  };

  const mockNonRetryableError: GetBiometricSessionError = {
    isRetryable: false,
  };

  const mockGetBiometricSessionRetryableFailure = jest
    .fn()
    .mockResolvedValue(errorResult(mockRetryableError));

  const mockGetBiometricSessionNonRetryableFailure = jest
    .fn()
    .mockResolvedValue(errorResult(mockNonRetryableError));

  const mockGetSecretsSuccess = jest.fn().mockResolvedValue(
    successResult({
      mockBiometricViewerAccessKey: "mockViewerKey",
    }),
  );

  const validVendorProcessingQueueSqsEventRecord = {
    messageId: mockSqsInboundMessageId,
    receiptHandle: "mockReceiptHandle",
    body: JSON.stringify({
      biometricSessionId: mockBiometricSessionId,
      sessionId: mockSessionId,
    }),
    attributes: {
      ApproximateReceiveCount: "1",
      SentTimestamp: ONE_HOUR_AGO_IN_MILLISECONDS.toString(),
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
    getSession: mockGetSessionSuccess,
    updateSession: jest.fn().mockResolvedValue(
      successResult({
        attributes: validBiometricSessionFinishedAttributes,
      }),
    ),
  };

  const mockSuccessfulGetCredentialFromBiometricSession = jest
    .fn()
    .mockReturnValue(
      successResult({
        credential: mockBiometricCredential,
        analytics: mockAnalyticsData,
        audit: "mockAudit",
        advisories: "mockAdvisories",
      }),
    );

  const mockSignedJwt = "mockHeader.mockPayload.mockSignature";
  const mockCreateKmsSignedJwtSuccess = jest
    .fn()
    .mockResolvedValue(successResult(mockSignedJwt));

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);
    dependencies = {
      env: {
        BIOMETRIC_VIEWER_KEY_SECRET_PATH: "mockBiometricViewerAccessKey",
        BIOMETRIC_VIEWER_ACCESS_KEY_SECRET_CACHE_DURATION_IN_SECONDS: "900",
        READID_BASE_URL: "mockReadIdBaseUrl",
        IPVCORE_OUTBOUND_SQS: "mockIpvcoreOutboundSqs",
        SESSION_TABLE_NAME: "mockTableName",
        TXMA_SQS: "mockTxmaSqs",
        ISSUER: mockIssuer,
        ENABLE_BIOMETRIC_RESIDENCE_CARD: "true",
        ENABLE_BIOMETRIC_RESIDENCE_PERMIT: "true",
        ENABLE_DRIVING_LICENCE: "true",
        ENABLE_NFC_PASSPORT: "true",
        ENABLE_UTOPIA_TEST_DOCUMENT: "true",
        VERIFIABLE_CREDENTIAL_SIGNING_KEY_ID:
          "mockVerifiableCredentialSigningKeyId",
      },
      getSessionRegistry: () => mockSessionRegistrySuccess,
      getSecrets: mockGetSecretsSuccess,
      getBiometricSession: mockGetBiometricSessionSuccess,
      getEventService: () => mockSuccessfulEventService,
      sendMessageToSqs: mockSendMessageToSqsSuccess,
      getCredentialFromBiometricSession:
        mockSuccessfulGetCredentialFromBiometricSession,
      createKmsSignedJwt: mockCreateKmsSignedJwtSuccess,
    };
    context = buildLambdaContext();
    consoleInfoSpy = jest.spyOn(console, "info");
    consoleErrorSpy = jest.spyOn(console, "error");
  });

  describe("On every invocation", () => {
    beforeEach(async () => {
      await lambdaHandlerConstructor(dependencies, validSqsEvent, context);
    });

    it("Adds context, version and empty user agent to log attributes and logs STARTED message", () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_STARTED",
        functionVersion: "1",
        function_arn: "arn:12345",
        userAgent: { userAgentHeader: "", deviceType: "unknown" },
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
      ["ENABLE_BIOMETRIC_RESIDENCE_CARD"],
      ["ENABLE_BIOMETRIC_RESIDENCE_PERMIT"],
      ["ENABLE_DRIVING_LICENCE"],
      ["ENABLE_NFC_PASSPORT"],
      ["ENABLE_UTOPIA_TEST_DOCUMENT"],
      ["VERIFIABLE_CREDENTIAL_SIGNING_KEY_ID"],
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

        it("Logs DCMAW_ASYNC_CRI_ERROR audit event error", () => {
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_ERROR_WRITING_AUDIT_EVENT",
            data: { auditEventName: expectedErrorTxmaEventName },
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

        it("Writes DCMAW_ASYNC_CRI_ERROR to TxMA", () => {
          expect(
            mockSuccessfulEventService.writeGenericEvent,
          ).toHaveBeenCalledWith({
            eventName: expectedErrorTxmaEventName,
            componentId: mockIssuer,
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

  describe("When session state is ASYNC_RESULT_SENT", () => {
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

    it("Logs COMPLETED with message properties and persistent identifiers", async () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
        sqsMessageProperties: {
          messageId: mockSqsInboundMessageId,
          approximateReceiveCount: "1",
        },
        persistentIdentifiers: {
          biometricSessionId: mockBiometricSessionId,
          govukSigninJourneyId: mockGovukSigninJourneyId,
        },
      });
    });
  });

  describe("When session state is ASYNC_BIOMETRIC_SESSION_FINISHED", () => {
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

    describe("When biometric session retrieval fails", () => {
      describe("With retryable error", () => {
        beforeEach(async () => {
          dependencies.getBiometricSession =
            mockGetBiometricSessionRetryableFailure;
          try {
            await lambdaHandlerConstructor(
              dependencies,
              validSqsEvent,
              context,
            );
          } catch (error: unknown) {
            lambdaError = error;
          }
        });

        it("Throws RetainMessageOnQueue with appropriate message", () => {
          expect(lambdaError).toBeInstanceOf(RetainMessageOnQueue);
          expect((lambdaError as RetainMessageOnQueue).message).toMatch(
            /Retryable error/,
          );
        });
      });

      describe("With non-retryable error", () => {
        beforeEach(async () => {
          dependencies.getBiometricSession =
            mockGetBiometricSessionNonRetryableFailure;
          await lambdaHandlerConstructor(dependencies, validSqsEvent, context);
        });

        it("Sends error to IPV Core", () => {
          expect(mockSendMessageToSqsSuccess).toHaveBeenCalledWith(
            "mockIpvcoreOutboundSqs",
            {
              sub: mockSubjectIdentifier,
              state: mockClientState,
              govuk_signin_journey_id: mockGovukSigninJourneyId,
              error: "server_error",
              error_description: "Internal server error",
            },
          );
        });

        it("Sends event to TxMA", () => {
          expect(mockWriteGenericEventSuccessResult).toHaveBeenCalledWith(
            expect.objectContaining({
              eventName: expectedErrorTxmaEventName,
              componentId: mockIssuer,
            }),
          );
        });

        describe("When sending error to IPV Core fails", () => {
          beforeEach(async () => {
            dependencies.sendMessageToSqs = mockSendMessageToSqsFailure;
            dependencies.getBiometricSession =
              mockGetBiometricSessionNonRetryableFailure;
            await lambdaHandlerConstructor(
              dependencies,
              validSqsEvent,
              context,
            );
          });

          it("Logs IPV Core message error", () => {
            expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
              messageCode:
                "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_IPV_CORE_MESSAGE_ERROR",
              data: { messageType: "ERROR_MESSAGE" },
              persistentIdentifiers: {
                govukSigninJourneyId: mockGovukSigninJourneyId,
              },
            });
          });

          it("Still sends event to TxMA", () => {
            expect(mockWriteGenericEventSuccessResult).toHaveBeenCalledWith(
              expect.objectContaining({
                eventName: expectedErrorTxmaEventName,
                componentId: mockIssuer,
              }),
            );
          });

          describe("Given writing TxMA event fails", () => {
            beforeEach(async () => {
              dependencies.getEventService = () => ({
                ...mockInertEventService,
                writeGenericEvent: jest.fn().mockResolvedValue(
                  errorResult({
                    errorMessage: "mockError",
                  }),
                ),
              });

              await lambdaHandlerConstructor(
                dependencies,
                validSqsEvent,
                context,
              );
            });

            it("Logs DCMAW_ASYNC_CRI_ERROR audit event error", () => {
              expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
                messageCode: "MOBILE_ASYNC_ERROR_WRITING_AUDIT_EVENT",
                data: { auditEventName: expectedErrorTxmaEventName },
                persistentIdentifiers: {
                  govukSigninJourneyId: mockGovukSigninJourneyId,
                },
              });
            });

            it("Does not log COMPLETED", () => {
              expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
                messageCode:
                  "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
              });
            });
          });

          describe("Given writing TxMA event succeeds", () => {
            beforeEach(async () => {
              await lambdaHandlerConstructor(
                dependencies,
                validSqsEvent,
                context,
              );
            });

            it("Writes DCMAW_ASYNC_CRI_ERROR to TxMA", () => {
              expect(
                mockSuccessfulEventService.writeGenericEvent,
              ).toHaveBeenCalledWith({
                eventName: expectedErrorTxmaEventName,
                componentId: mockIssuer,
                getNowInMilliseconds: Date.now,
                sessionId: mockSessionId,
                govukSigninJourneyId: mockGovukSigninJourneyId,
                ipAddress: undefined,
                redirect_uri: undefined,
                sub: "mockSubjectIdentifier",
                suspected_fraud_signal: undefined,
                transactionId: mockBiometricSessionId,
                txmaAuditEncoded: undefined,
              });
            });

            it("Does not log COMPLETED", () => {
              expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
                messageCode:
                  "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
              });
            });
          });
        });
      });
    });

    describe("When biometric session is not ready", () => {
      beforeEach(async () => {
        dependencies.getBiometricSession = mockGetBiometricSessionNotReady;
        try {
          await lambdaHandlerConstructor(dependencies, validSqsEvent, context);
        } catch (error: unknown) {
          lambdaError = error;
        }
      });

      it("Logs NOT_READY with documentType, message properties and persistent identifiers", () => {
        expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_NOT_READY",
          data: {
            finish: "PROCESSING",
          },
          documentType: "NFC_PASSPORT",
          sqsMessageProperties: {
            messageId: mockSqsInboundMessageId,
            approximateReceiveCount: "1",
          },
          persistentIdentifiers: {
            biometricSessionId: mockBiometricSessionId,
            govukSigninJourneyId: mockGovukSigninJourneyId,
          },
        });
      });

      it("Throws RetainMessageOnQueue with appropriate message", () => {
        expect(lambdaError).toBeInstanceOf(RetainMessageOnQueue);
        expect((lambdaError as RetainMessageOnQueue).message).toMatch(
          /Biometric session not ready: PROCESSING/,
        );
      });

      it("Logs COMPLETED with message properties and persistent identifiers", () => {
        expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
          sqsMessageProperties: {
            messageId: mockSqsInboundMessageId,
            approximateReceiveCount: "1",
          },
          persistentIdentifiers: {
            biometricSessionId: mockBiometricSessionId,
            govukSigninJourneyId: mockGovukSigninJourneyId,
          },
        });
      });
    });

    describe("Get credential from biometric session error scenarios", () => {
      const serverErrorMessage = {
        sub: mockSubjectIdentifier,
        state: mockClientState,
        govuk_signin_journey_id: mockGovukSigninJourneyId,
        error: "server_error",
        error_description: "Internal server error",
      };

      describe("Given an unexpected error is thrown", () => {
        describe("Given writing to txma fails", () => {
          beforeEach(async () => {
            dependencies.getCredentialFromBiometricSession = jest
              .fn()
              .mockImplementation(() => {
                throw Error("UNEXPECTED_FAILURE");
              });

            dependencies.getEventService = () => ({
              ...mockInertEventService,
              writeGenericEvent: jest.fn().mockResolvedValue(
                errorResult({
                  errorMessage: "mockError",
                }),
              ),
            });

            await lambdaHandlerConstructor(
              dependencies,
              validSqsEvent,
              context,
            );
          });

          it("Logs BIOMETRIC_SESSION_UNEXPECTED_FAILURE", () => {
            expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
              messageCode:
                "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_BIOMETRIC_SESSION_UNEXPECTED_FAILURE",
              error: {
                message: "UNEXPECTED_FAILURE",
              },
              persistentIdentifiers: {
                govukSigninJourneyId: mockGovukSigninJourneyId,
              },
            });
          });

          it("Sends server_error to IPV Core", () => {
            expect(mockSendMessageToSqsSuccess).toHaveBeenCalledWith(
              "mockIpvcoreOutboundSqs",
              serverErrorMessage,
            );
          });

          it("Logs DCMAW_ASYNC_CRI_ERROR audit event failure", () => {
            expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
              messageCode: "MOBILE_ASYNC_ERROR_WRITING_AUDIT_EVENT",
              data: { auditEventName: expectedErrorTxmaEventName },
              persistentIdentifiers: {
                govukSigninJourneyId: mockGovukSigninJourneyId,
              },
            });
          });

          it("Does not log COMPLETED", () => {
            expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
              messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
            });
          });
        });

        describe("Given writing to txma is successful", () => {
          beforeEach(async () => {
            dependencies.getCredentialFromBiometricSession = jest
              .fn()
              .mockImplementation(() => {
                throw Error("UNEXPECTED_FAILURE");
              });
            await lambdaHandlerConstructor(
              dependencies,
              validSqsEvent,
              context,
            );
          });

          it("Logs BIOMETRIC_SESSION_UNEXPECTED_FAILURE", async () => {
            expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
              messageCode:
                "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_BIOMETRIC_SESSION_UNEXPECTED_FAILURE",
              error: {
                message: "UNEXPECTED_FAILURE",
              },
              persistentIdentifiers: {
                govukSigninJourneyId: mockGovukSigninJourneyId,
              },
            });
          });

          it("Sends server_error to IPV Core", () => {
            expect(mockSendMessageToSqsSuccess).toHaveBeenCalledWith(
              "mockIpvcoreOutboundSqs",
              serverErrorMessage,
            );
          });

          it("Writes DCMAW_ASYNC_CRI_ERROR event to TxMA", () => {
            expect(
              mockSuccessfulEventService.writeGenericEvent,
            ).toHaveBeenCalledWith({
              componentId: mockIssuer,
              eventName: expectedErrorTxmaEventName,
              getNowInMilliseconds: Date.now,
              govukSigninJourneyId: mockGovukSigninJourneyId,
              ipAddress: undefined,
              redirect_uri: undefined,
              sessionId: "58f4281d-d988-49ce-9586-6ef70a2be0b4",
              sub: "mockSubjectIdentifier",
              transactionId: mockBiometricSessionId,
              txmaAuditEncoded: undefined,
            });
          });

          it("Does not log COMPLETED", async () => {
            expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
              messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
            });
          });
        });
      });

      describe("Given a known error scenario is returned", () => {
        describe.each([
          {
            errorCode: "SUSPECTED_FRAUD",
            expectedSqsMessage: {
              sub: mockSubjectIdentifier,
              state: mockClientState,
              govuk_signin_journey_id: mockGovukSigninJourneyId,
              error: "access_denied",
              error_description: "Suspected fraud detected",
            },
            expectedSuspectedFraudSignal: "mockErrorReason",
            logMessage:
              "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_SUSPECTED_FRAUD",
          },
          {
            errorCode: "BIOMETRIC_SESSION_PARSE_FAILURE",
            expectedSqsMessage: serverErrorMessage,
            expectedSuspectedFraudSignal: undefined,
            logMessage:
              "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_BIOMETRIC_SESSION_PARSE_FAILURE",
          },
          {
            errorCode: "BIOMETRIC_SESSION_NOT_VALID",
            expectedSqsMessage: serverErrorMessage,
            expectedSuspectedFraudSignal: undefined,
            logMessage:
              "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_BIOMETRIC_SESSION_NOT_VALID",
          },
          {
            errorCode: "VENDOR_LIKENESS_DISABLED",
            expectedSqsMessage: serverErrorMessage,
            expectedSuspectedFraudSignal: undefined,
            logMessage:
              "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_VENDOR_LIKENESS_DISABLED",
          },
        ])(
          "Given the error code is $errorCode",
          ({
            errorCode,
            expectedSqsMessage,
            expectedSuspectedFraudSignal,
            logMessage,
          }) => {
            describe("Given writing to txma fails", () => {
              beforeEach(async () => {
                dependencies.getCredentialFromBiometricSession = jest
                  .fn()
                  .mockReturnValue(
                    errorResult({
                      errorCode,
                      errorReason: "mockErrorReason",
                      data: {
                        mockData: "mockData",
                      },
                    }),
                  );
                dependencies.getEventService = () => ({
                  ...mockInertEventService,
                  writeGenericEvent: jest.fn().mockResolvedValue(
                    errorResult({
                      errorMessage: "mockError",
                    }),
                  ),
                });

                await lambdaHandlerConstructor(
                  dependencies,
                  validSqsEvent,
                  context,
                );
              });

              it(`Logs ${logMessage}`, () => {
                expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
                  messageCode: logMessage,
                  data: {
                    errorReason: "mockErrorReason",
                    mockData: "mockData",
                  },
                  persistentIdentifiers: {
                    govukSigninJourneyId: mockGovukSigninJourneyId,
                  },
                });
              });

              it("Sends server_error to IPV Core", () => {
                expect(mockSendMessageToSqsSuccess).toHaveBeenCalledWith(
                  "mockIpvcoreOutboundSqs",
                  expectedSqsMessage,
                );
              });

              it("Logs DCMAW_ASYNC_CRI_ERROR audit event failure", () => {
                expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
                  messageCode: "MOBILE_ASYNC_ERROR_WRITING_AUDIT_EVENT",
                  data: { auditEventName: expectedErrorTxmaEventName },
                  persistentIdentifiers: {
                    govukSigninJourneyId: mockGovukSigninJourneyId,
                  },
                });
              });

              it("Does not log COMPLETED", () => {
                expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
                  messageCode:
                    "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
                });
              });
            });

            describe("Given writing to txma succeeds", () => {
              beforeEach(async () => {
                dependencies.getCredentialFromBiometricSession = jest
                  .fn()
                  .mockReturnValue(
                    errorResult({
                      errorCode,
                      errorReason: "mockErrorReason",
                      data: {
                        mockData: "mockData",
                      },
                    }),
                  );

                await lambdaHandlerConstructor(
                  dependencies,
                  validSqsEvent,
                  context,
                );
              });

              it(`Logs ${logMessage}`, () => {
                expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
                  messageCode: logMessage,
                  data: {
                    errorReason: "mockErrorReason",
                    mockData: "mockData",
                  },
                  persistentIdentifiers: {
                    govukSigninJourneyId: mockGovukSigninJourneyId,
                  },
                });
              });

              it("Sends server_error to IPV Core", () => {
                expect(mockSendMessageToSqsSuccess).toHaveBeenCalledWith(
                  "mockIpvcoreOutboundSqs",
                  expectedSqsMessage,
                );
              });

              it("Writes DCMAW_ASYNC_CRI_ERROR event to TxMA", () => {
                expect(
                  mockSuccessfulEventService.writeGenericEvent,
                ).toHaveBeenCalledWith({
                  componentId: mockIssuer,
                  eventName: expectedErrorTxmaEventName,
                  getNowInMilliseconds: Date.now,
                  govukSigninJourneyId: mockGovukSigninJourneyId,
                  ipAddress: undefined,
                  redirect_uri: undefined,
                  sessionId: "58f4281d-d988-49ce-9586-6ef70a2be0b4",
                  sub: "mockSubjectIdentifier",
                  suspected_fraud_signal: expectedSuspectedFraudSignal,
                  transactionId: mockBiometricSessionId,
                  txmaAuditEncoded: undefined,
                });
              });

              it("Does not log COMPLETED", () => {
                expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
                  messageCode:
                    "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
                });
              });
            });
          },
        );
      });
    });

    describe("Given signing jwt fails", () => {
      beforeEach(async () => {
        dependencies.createKmsSignedJwt = jest
          .fn()
          .mockResolvedValue(emptyFailure());

        try {
          await lambdaHandlerConstructor(dependencies, validSqsEvent, context);
        } catch (error: unknown) {
          lambdaError = error;
        }
      });

      it("Throws RetainMessageOnQueue", async () => {
        expect(lambdaError).toEqual(
          new RetainMessageOnQueue(
            "Unexpected failure signing verified credential jwt",
          ),
        );
      });
    });

    describe("Writing verifiable credential to IPVCore outbound queue errors", () => {
      describe("Given writing to the outbound queue fails", () => {
        beforeEach(async () => {
          dependencies.sendMessageToSqs = mockSendMessageToSqsFailure;
          try {
            await lambdaHandlerConstructor(
              dependencies,
              validSqsEvent,
              context,
            );
          } catch (error: unknown) {
            lambdaError = error;
          }
        });

        it("Logs IPV_CORE_MESSAGE_ERROR", async () => {
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode:
              "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_IPV_CORE_MESSAGE_ERROR",
            data: { messageType: "VERIFIABLE_CREDENTIAL" },
            persistentIdentifiers: {
              govukSigninJourneyId: mockGovukSigninJourneyId,
            },
          });
        });

        it("Throws RetainMessageOnQueue", async () => {
          expect(lambdaError).toEqual(
            new RetainMessageOnQueue(
              "Unexpected failure writing the VC to the IPVCore outbound queue",
            ),
          );
        });
      });
    });

    describe("Update session failures", () => {
      describe.each([
        UpdateSessionError.CONDITIONAL_CHECK_FAILURE,
        UpdateSessionError.INTERNAL_SERVER_ERROR,
        UpdateSessionError.SESSION_NOT_FOUND,
      ])(
        "Given the error type is %s",
        (updateSessionError: UpdateSessionError) => {
          describe("Given writing TxMA event fails", () => {
            beforeEach(async () => {
              dependencies.getSessionRegistry = () => ({
                ...mockInertSessionRegistry,
                getSession: mockGetSessionSuccess,
                updateSession: jest.fn().mockResolvedValue(
                  errorResult({
                    errorType: updateSessionError,
                  }),
                ),
              });
              dependencies.getEventService = () => mockFailingEventService;

              await lambdaHandlerConstructor(
                dependencies,
                validSqsEvent,
                context,
              );
            });

            it("Passes correct arguments to the Event Service", async () => {
              expect(
                mockFailingEventService.writeGenericEvent,
              ).toHaveBeenCalledWith(
                expect.objectContaining({
                  componentId: mockIssuer,
                  eventName: expectedErrorTxmaEventName,
                  govukSigninJourneyId: mockGovukSigninJourneyId,
                  ipAddress: undefined,
                  redirect_uri: undefined,
                  sessionId: mockSessionId,
                  sub: mockSubjectIdentifier,
                  suspected_fraud_signal: undefined,
                  transactionId: mockBiometricSessionId,
                  txmaAuditEncoded: undefined,
                }),
              );
            });

            it("Logs DCMAW_ASYNC_CRI_ERROR audit event error", () => {
              expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
                messageCode: "MOBILE_ASYNC_ERROR_WRITING_AUDIT_EVENT",
                data: { auditEventName: expectedErrorTxmaEventName },
                persistentIdentifiers: {
                  govukSigninJourneyId: mockGovukSigninJourneyId,
                },
              });
            });

            it("Does not log COMPLETED", () => {
              expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
                messageCode:
                  "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
              });
            });
          });

          describe("Given writing the CRI_ERROR event to TXMA succeeds", () => {
            beforeEach(async () => {
              dependencies.getSessionRegistry = () => ({
                ...mockInertSessionRegistry,
                getSession: mockGetSessionSuccess,
                updateSession: jest.fn().mockResolvedValue(
                  errorResult({
                    errorType: updateSessionError,
                  }),
                ),
              });

              await lambdaHandlerConstructor(
                dependencies,
                validSqsEvent,
                context,
              );
            });

            it("Passes correct arguments to the Event Service", () => {
              expect(
                mockSuccessfulEventService.writeGenericEvent,
              ).toHaveBeenCalledWith(
                expect.objectContaining({
                  componentId: mockIssuer,
                  eventName: expectedErrorTxmaEventName,
                  govukSigninJourneyId: mockGovukSigninJourneyId,
                  ipAddress: undefined,
                  redirect_uri: undefined,
                  sessionId: mockSessionId,
                  sub: mockSubjectIdentifier,
                  suspected_fraud_signal: undefined,
                  transactionId: mockBiometricSessionId,
                  txmaAuditEncoded: undefined,
                }),
              );
            });

            it("Does not log COMPLETED", () => {
              expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
                messageCode:
                  "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
              });
            });
          });
        },
      );
    });

    describe("Given sending DCMAW_ASYNC_CRI_VC_ISSUED event fails", () => {
      beforeEach(async () => {
        dependencies = {
          ...dependencies,
          sendMessageToSqs: () => Promise.resolve(
            {
            isError: true,
            }
          )
        };

        await lambdaHandlerConstructor(dependencies, validSqsEvent, context);
      });

      it("Logs the DCMAW_ASYNC_CRI_VC_ISSUED event failure", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_ERROR_WRITING_AUDIT_EVENT",
          data: {
            auditEventName: "DCMAW_ASYNC_CRI_VC_ISSUED",
          },
          persistentIdentifiers: {
            govukSigninJourneyId: mockGovukSigninJourneyId,
          },
        });
      });

      it("Does not log COMPLETED", () => {
        expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
        });
      });
    });

    describe("Given sending DCMAW_ASYNC_CRI_END event fails", () => {
      beforeEach(async () => {
        dependencies = {
          ...dependencies,
          getEventService: () => mockFailingCriEventService,
        };

        await lambdaHandlerConstructor(dependencies, validSqsEvent, context);
      });

      it("Logs the DCMAW_ASYNC_CRI_END event failure", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_ERROR_WRITING_AUDIT_EVENT",
          data: {
            auditEventName: "DCMAW_ASYNC_CRI_END",
          },
          persistentIdentifiers: {
            govukSigninJourneyId: mockGovukSigninJourneyId,
          },
        });
      });

      it("Does not log COMPLETED", () => {
        expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
        });
      });
    });

    describe("Happy path", () => {
      describe("Given generated biometric credential does not have flags or contraindicators", () => {
        const mockSuccessfulGetCredentialFromBiometricSession = jest
          .fn()
          .mockReturnValue(
            successResult({
              credential: mockBiometricCredential,
              analytics: mockAnalyticsData,
              audit: mockAuditData,
              advisories: "mockAdvisories",
            }),
          );

        beforeEach(async () => {
          dependencies.getCredentialFromBiometricSession =
            mockSuccessfulGetCredentialFromBiometricSession;
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
            mockBiometricSessionId,
            "mockViewerKey",
          );
        });

        it("Passes correct arguments to getCredentialFromBiometricSession", () => {
          expect(
            mockSuccessfulGetCredentialFromBiometricSession,
          ).toHaveBeenCalledWith(
            { finish: "DONE" },
            {
              userSessionCreatedAt: 1704106860000,
              opaqueId: "mockOpaqueId",
            },
            {
              enableUtopiaTestDocument: true,
              enableDrivingLicence: true,
              enableNfcPassport: true,
              enableBiometricResidencePermit: true,
              enableBiometricResidenceCard: true,
            },
            getCredentialFromBiometricSessionLogger,
          );
        });

        it("Passes correct arguments to createKmsSignedJwt", () => {
          expect(mockCreateKmsSignedJwtSuccess).toHaveBeenCalledWith(
            "mockVerifiableCredentialSigningKeyId",
            {
              iat: 1704110400,
              iss: "mockIssuer",
              jti: "urn:uuid:mock_random_uuid",
              nbf: 1704110400,
              sub: "mockSubjectIdentifier",
              vc: mockBiometricCredential,
            },
          );
        });

        it("Passes correct arguments to sendMessageToSqs (verifiable credential)", async () => {
          expect(mockSendMessageToSqsSuccess).toHaveBeenCalledWith(
            "mockIpvcoreOutboundSqs",
            {
              "https://vocab.account.gov.uk/v1/credentialJWT": [mockSignedJwt],
              state: mockClientState,
              sub: mockSubjectIdentifier,
              govuk_signin_journey_id: mockGovukSigninJourneyId,
            },
          );
        });

        it("Logs ISSUE_BIOMETRIC_CREDENTIAL_VC_ISSUED with documentType, message properties and persistent identifiers", async () => {
          expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_VC_ISSUED",
            documentType: "NFC_PASSPORT",
            vendorProcessingQueueToVcIssuanceElapsedTimeInMs:
              NOW_IN_MILLISECONDS - ONE_HOUR_AGO_IN_MILLISECONDS,
            sqsMessageProperties: {
              messageId: mockSqsInboundMessageId,
              approximateReceiveCount: "1",
            },
          });
        });

        it("Writes DCMAW_ASYNC_CRI_VC_ISSUED event to TxMA", () => {
          expect(mockWriteGenericEventSuccessResult).toHaveBeenNthCalledWith(
            1,
            {
              eventName: "DCMAW_ASYNC_CRI_VC_ISSUED",
              componentId: mockIssuer,
              getNowInMilliseconds: Date.now,
              sessionId: mockSessionId,
              govukSigninJourneyId: mockGovukSigninJourneyId,
              transactionId: mockBiometricSessionId,
              ipAddress: undefined,
              redirect_uri: undefined,
              sub: mockSubjectIdentifier,
              suspected_fraud_signal: undefined,
              txmaAuditEncoded: undefined,
              flaggedRecord: undefined,
              flags: undefined,
              evidence: [
                {
                  type: "IdentityCheck",
                  txn: "mockTxn",
                  strengthScore: 0,
                  validityScore: 0,
                  activityHistoryScore: 0,
                  checkDetails: [
                    {
                      checkMethod: "bvr",
                      identityCheckPolicy: "published",
                      activityFrom: undefined,
                      biometricVerificationProcessLevel: 0,
                    },
                  ],
                  txmaContraIndicators: [],
                },
              ],
              credentialSubject: mockCredentialSubject,
            },
          );
        });

        it("Writes DCMAW_ASYNC_CRI_END event to TxMA", () => {
          expect(mockWriteGenericEventSuccessResult).toHaveBeenNthCalledWith(
            2,
            {
              eventName: "DCMAW_ASYNC_CRI_END",
              componentId: mockIssuer,
              getNowInMilliseconds: Date.now,
              sessionId: mockSessionId,
              transactionId: mockBiometricSessionId,
              govukSigninJourneyId: mockGovukSigninJourneyId,
              ipAddress: undefined,
              redirect_uri: undefined,
              sub: mockSubjectIdentifier,
              suspected_fraud_signal: undefined,
              txmaAuditEncoded: undefined,
            },
          );
        });

        it("Logs COMPLETED with documentType, message properties, persistent identifiers, and SQS response MessageId", () => {
          expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
            sqsMessageProperties: {
              messageId: mockSqsInboundMessageId,
              approximateReceiveCount: "1",
            },
            documentType: "NFC_PASSPORT",
            persistentIdentifiers: {
              biometricSessionId: mockBiometricSessionId,
              govukSigninJourneyId: mockGovukSigninJourneyId,
            },
            outboundSqsMessageResponseProperties: {
              messageId: mockSqsResponseMessageId,
            },
          });
        });
      });

      describe("Given generated biometric credential has flags and flaggedRecord", () => {
        const mockAuditDataWithFlags = {
          ...mockAuditData,
          flags: ["FLAG_1", "FLAG_2"],
          flaggedRecord: {
            mockKey: "mockValue",
          },
        };

        const mockGetCredentialFromBiometricSessionWithFlags = jest
          .fn()
          .mockReturnValue(
            successResult({
              credential: mockBiometricCredential,
              analytics: mockAnalyticsData,
              audit: mockAuditDataWithFlags,
              advisories: "mockAdvisories",
            }),
          );

        beforeEach(async () => {
          dependencies.getCredentialFromBiometricSession =
            mockGetCredentialFromBiometricSessionWithFlags;
          await lambdaHandlerConstructor(dependencies, validSqsEvent, context);
        });

        it("Writes DCMAW_ASYNC_CRI_VC_ISSUED event with flaggedRecord to TxMA", () => {
          expect(mockWriteGenericEventSuccessResult).toHaveBeenCalledWith(
            expect.objectContaining({
              eventName: "DCMAW_ASYNC_CRI_VC_ISSUED",
              flaggedRecord: {
                mockKey: "mockValue",
              },
              flags: ["FLAG_1", "FLAG_2"],
              evidence: [
                expect.objectContaining({
                  txmaContraIndicators: [],
                }),
              ],
            }),
          );
        });
      });

      describe("Given generated biometric credential has contraindicators", () => {
        const mockCredentialWithContraIndicators = {
          ...mockBiometricCredential,
          evidence: [
            {
              ...mockBiometricCredential.evidence[0],
              ci: ["CI_1"],
            },
          ],
        };

        const mockAuditDataWithContraIndicatorReasons = {
          contraIndicatorReasons: ["Reason 1", "Reason 2"],
          txmaContraIndicators: ["TxMA_CI_1", "TxMA_CI_2"],
        };

        const mockGetCredentialFromBiometricSessionWithCI = jest
          .fn()
          .mockReturnValue(
            successResult({
              credential: mockCredentialWithContraIndicators,
              analytics: "mockAnalytics",
              audit: mockAuditDataWithContraIndicatorReasons,
              advisories: "mockAdvisories",
            }),
          );

        beforeEach(async () => {
          dependencies.getCredentialFromBiometricSession =
            mockGetCredentialFromBiometricSessionWithCI;
          await lambdaHandlerConstructor(dependencies, validSqsEvent, context);
        });

        it("Writes DCMAW_ASYNC_CRI_VC_ISSUED event with ciReasons to TxMA", () => {
          expect(mockWriteGenericEventSuccessResult).toHaveBeenCalledWith(
            expect.objectContaining({
              eventName: "DCMAW_ASYNC_CRI_VC_ISSUED",
              flaggedRecord: undefined,
              evidence: [
                expect.objectContaining({
                  ci: ["CI_1"],
                  ciReasons: ["Reason 1", "Reason 2"],
                  txmaContraIndicators: ["TxMA_CI_1", "TxMA_CI_2"],
                }),
              ],
            }),
          );
        });
      });

      describe("With both flags and contraIndicators", () => {
        const mockCredentialWithContraIndicators = {
          ...mockBiometricCredential,
          evidence: [
            {
              ...mockBiometricCredential.evidence[0],
              ci: ["CI_1"],
            },
          ],
        };

        const mockAuditDataWithBothFlagsAndCI = {
          contraIndicatorReasons: ["CI Reason"],
          txmaContraIndicators: ["TxMA_CI_1"],
          flags: ["FLAG_1"],
          flaggedRecord: {
            mockFlaggedRecordField: "mockFlaggedRecordValue",
          },
        };

        const mockGetCredentialFromBiometricSessionWithBoth = jest
          .fn()
          .mockReturnValue(
            successResult({
              credential: mockCredentialWithContraIndicators,
              analytics: "mockAnalytics",
              audit: mockAuditDataWithBothFlagsAndCI,
              advisories: "mockAdvisories",
            }),
          );

        beforeEach(async () => {
          dependencies.getCredentialFromBiometricSession =
            mockGetCredentialFromBiometricSessionWithBoth;
          await lambdaHandlerConstructor(dependencies, validSqsEvent, context);
        });

        it("Writes DCMAW_ASYNC_CRI_VC_ISSUED event with both flaggedRecord and ciReasons to TxMA", () => {
          expect(mockWriteGenericEventSuccessResult).toHaveBeenCalledWith(
            expect.objectContaining({
              eventName: "DCMAW_ASYNC_CRI_VC_ISSUED",
              flaggedRecord: {
                mockFlaggedRecordField: "mockFlaggedRecordValue",
              },
              flags: ["FLAG_1"],
              evidence: [
                expect.objectContaining({
                  ci: ["CI_1"],
                  ciReasons: ["CI Reason"],
                  txmaContraIndicators: ["TxMA_CI_1"],
                }),
              ],
            }),
          );
        });
      });

      describe("Given credential has expired driving license advisory", () => {
        describe.each([
          ["2020-01-01", "2020-01-01"],
          [null, ""],
        ])(
          "Given driving licence expiry date in credential is %s",
          (expiryDate: string | null, expectedExpiryDateLogData: string) => {
            const mockCredentialWithExpiredDrivingLicense = {
              ...mockBiometricCredential,
              credentialSubject: {
                ...mockCredentialSubject,
                drivingPermit: [
                  {
                    expiryDate,
                  },
                ],
              },
            };

            const mockAdvisoriesWithExpiredDrivingLicense = [
              Advisory.VENDOR_CHECKS_PASSED_FOR_EXPIRED_DRIVING_LICENCE,
            ];

            const mockGetCredentialWithExpiredDrivingLicense = jest
              .fn()
              .mockReturnValue(
                successResult({
                  credential: mockCredentialWithExpiredDrivingLicense,
                  analytics: mockAnalyticsData,
                  audit: mockAuditData,
                  advisories: mockAdvisoriesWithExpiredDrivingLicense,
                }),
              );

            beforeEach(async () => {
              dependencies.getCredentialFromBiometricSession =
                mockGetCredentialWithExpiredDrivingLicense;
              await lambdaHandlerConstructor(
                dependencies,
                validSqsEvent,
                context,
              );
            });

            it("Logs expired driving license message with expiry date", () => {
              expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
                messageCode:
                  "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_VENDOR_CHECKS_PASSED_FOR_EXPIRED_DRIVING_LICENCE",
                data: { expiryDate: expectedExpiryDateLogData },
              });
            });

            it("Still completes successfully and logs COMPLETED", () => {
              expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
                messageCode:
                  "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
                documentType: "NFC_PASSPORT",
                sqsMessageProperties: {
                  messageId: mockSqsInboundMessageId,
                  approximateReceiveCount: "1",
                },
                persistentIdentifiers: {
                  biometricSessionId: mockBiometricSessionId,
                  govukSigninJourneyId: mockGovukSigninJourneyId,
                },
                outboundSqsMessageResponseProperties: {
                  messageId: mockSqsResponseMessageId,
                },
              });
            });
          },
        );
      });
    });
  });
});
