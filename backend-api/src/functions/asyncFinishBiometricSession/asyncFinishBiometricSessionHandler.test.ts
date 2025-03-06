import { APIGatewayProxyResult, Context } from "aws-lambda";
import { expect } from "@jest/globals";
import "../../../tests/testUtils/matchers";
import { IAsyncFinishBiometricSessionDependencies } from "./handlerDependencies";
import { buildLambdaContext } from "../testUtils/mockContext";
import { lambdaHandlerConstructor } from "./asyncFinishBiometricSessionHandler";
import { buildRequest } from "../testUtils/mockRequest";
import { logger } from "../common/logging/logger";
import {
  expectedSecurityHeaders,
  mockBiometricSessionId,
  mockInvalidUUID,
  mockSessionId,
  mockInertSessionRegistry,
  mockInertEventService,
  validBiometricSessionFinishedAttributes,
} from "../testUtils/unitTestData";
import {
  emptySuccess,
  successResult,
  errorResult,
  emptyFailure,
} from "../utils/result";
import { UpdateSessionError } from "../common/session/SessionRegistry";

describe("Async Finish Biometric Session", () => {
  let dependencies: IAsyncFinishBiometricSessionDependencies;
  let context: Context;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let result: APIGatewayProxyResult;

  // Constants for epoch timestamps
  const MOCK_CURRENT_TIME = 1708531200000; // 2024-02-21T12:00:00.000Z
  const MOCK_VALID_TIME = MOCK_CURRENT_TIME - 30 * 60 * 1000; // 30 minutes old
  const MOCK_EXPIRED_TIME = MOCK_CURRENT_TIME - 61 * 60 * 1000; // Over 1 hour old

  const validRequest = buildRequest({
    body: JSON.stringify({
      sessionId: mockSessionId,
      biometricSessionId: mockBiometricSessionId,
    }),
  });

  const mockWriteGenericEventSuccess = jest
    .fn()
    .mockResolvedValue(emptySuccess());

  const mockWriteGenericEventFaiilure = jest
    .fn()
    .mockResolvedValue(errorResult(new Error("Failed to write event")));

  const mockSuccessfulEventService = {
    ...mockInertEventService,
    writeGenericEvent: mockWriteGenericEventSuccess,
  };

  const mockFailingEventService = {
    ...mockInertEventService,
    writeGenericEvent: mockWriteGenericEventFaiilure,
  };

  const mockSessionUpdateSuccess = jest
    .fn()
    .mockResolvedValue(
      successResult({ attributes: validBiometricSessionFinishedAttributes }),
    );

  const mockSuccessfulSessionRegistry = {
    ...mockInertSessionRegistry,
    updateSession: mockSessionUpdateSuccess,
  };

  const mockSuccessfulSendMessageToSqs = jest
    .fn()
    .mockResolvedValue(emptySuccess());

  const mockFailingSendMessageToSqs = jest
    .fn()
    .mockResolvedValue(emptyFailure());

  beforeEach(() => {
    dependencies = {
      env: {
        SESSION_TABLE_NAME: "mockTableName",
        TXMA_SQS: "mockTxmaSqs",
        ISSUER: "mockIssuer",
        VENDOR_PROCESSING_SQS: "mockVendorProcessingSqs",
      },
      getSessionRegistry: () => mockSuccessfulSessionRegistry,
      getEventService: () => mockSuccessfulEventService,
      getSendMessageToSqs: () => mockSuccessfulSendMessageToSqs,
    };

    context = buildLambdaContext();
    consoleInfoSpy = jest.spyOn(console, "info");
    consoleErrorSpy = jest.spyOn(console, "error");
    jest.useFakeTimers();
    jest.setSystemTime(MOCK_CURRENT_TIME);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe("On every invocation", () => {
    beforeEach(async () => {
      result = await lambdaHandlerConstructor(
        dependencies,
        validRequest,
        context,
      );
    });

    it("Adds context and version to log attributes and logs STARTED message", () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_FINISH_BIOMETRIC_SESSION_STARTED",
        functionVersion: "1",
        function_arn: "arn:12345",
      });
    });

    it("Clears pre-existing log attributes", async () => {
      logger.appendKeys({ testKey: "testValue" });
      result = await lambdaHandlerConstructor(
        dependencies,
        validRequest,
        context,
      );

      expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
        testKey: "testValue",
      });
    });
  });

  describe("Config validation", () => {
    describe.each([
      ["SESSION_TABLE_NAME"],
      ["TXMA_SQS"],
      ["ISSUER"],
      ["VENDOR_PROCESSING_SQS"],
    ])("Given %s environment variable is missing", (envVar: string) => {
      beforeEach(async () => {
        delete dependencies.env[envVar];
        result = await lambdaHandlerConstructor(
          dependencies,
          validRequest,
          context,
        );
      });
      it("returns 500 Internal server error", async () => {
        expect(result).toStrictEqual({
          statusCode: 500,
          body: JSON.stringify({
            error: "server_error",
            error_description: "Internal Server Error",
          }),
          headers: expectedSecurityHeaders,
        });
      });
      it("logs INVALID_CONFIG", async () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_FINISH_BIOMETRIC_SESSION_INVALID_CONFIG",
          data: {
            missingEnvironmentVariables: [envVar],
          },
        });
      });
    });
  });

  describe("Request body validation", () => {
    describe("Given request body is invalid", () => {
      beforeEach(async () => {
        const request = buildRequest({
          body: JSON.stringify({
            sessionId: mockInvalidUUID,
            biometricSessionId: mockBiometricSessionId,
          }),
        });
        result = await lambdaHandlerConstructor(dependencies, request, context);
      });

      it("Logs the error", async () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_FINISH_BIOMETRIC_SESSION_REQUEST_BODY_INVALID",
          errorMessage: `sessionId in request body is not a valid v4 UUID. sessionId: ${mockInvalidUUID}`,
        });
      });

      it("Returns 400 Bad Request response", async () => {
        expect(result).toStrictEqual({
          headers: expectedSecurityHeaders,
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: `sessionId in request body is not a valid v4 UUID. sessionId: ${mockInvalidUUID}`,
          }),
        });
      });
    });
  });

  describe("Session update scenarios", () => {
    describe("When session not found", () => {
      describe("and audit event write fails", () => {
        beforeEach(async () => {
          dependencies = {
            ...dependencies,
            getEventService: () => mockFailingEventService,
            getSessionRegistry: () => ({
              ...mockInertSessionRegistry,
              updateSession: jest.fn().mockResolvedValue(
                errorResult({
                  errorType: UpdateSessionError.SESSION_NOT_FOUND,
                }),
              ),
            }),
          };
          result = await lambdaHandlerConstructor(
            dependencies,
            validRequest,
            context,
          );
        });

        it("Logs audit event error and returns 500", () => {
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_ERROR_WRITING_AUDIT_EVENT",
            data: { auditEventName: "DCMAW_ASYNC_CRI_4XXERROR" },
          });
          expect(result.statusCode).toBe(500);
        });
      });
      describe("and audit event succeeds", () => {
        beforeEach(async () => {
          dependencies.getSessionRegistry = () => ({
            ...mockInertSessionRegistry,
            updateSession: jest.fn().mockResolvedValue(
              errorResult({
                errorType: UpdateSessionError.SESSION_NOT_FOUND,
              }),
            ),
          });
          result = await lambdaHandlerConstructor(
            dependencies,
            validRequest,
            context,
          );
        });

        it("Writes error event to TxMA and returns 401", () => {
          expect(mockWriteGenericEventSuccess).toBeCalledWith({
            eventName: "DCMAW_ASYNC_CRI_4XXERROR",
            componentId: "mockIssuer",
            getNowInMilliseconds: Date.now,
            govukSigninJourneyId: undefined,
            sessionId: mockSessionId,
            sub: undefined,
            transactionId: mockBiometricSessionId,
          });
          expect(result.statusCode).toBe(401);
        });
      });
    });

    describe("When session fails conditional check", () => {
      describe("and session is expired", () => {
        const expiredSessionAttributes = {
          ...validBiometricSessionFinishedAttributes,
          createdAt: MOCK_EXPIRED_TIME,
        };

        beforeEach(async () => {
          dependencies.getSessionRegistry = () => ({
            ...mockInertSessionRegistry,
            updateSession: jest.fn().mockResolvedValue(
              errorResult({
                errorType: UpdateSessionError.CONDITIONAL_CHECK_FAILURE,
                attributes: expiredSessionAttributes,
              }),
            ),
          });
          result = await lambdaHandlerConstructor(
            dependencies,
            validRequest,
            context,
          );
        });

        it("Writes fraud signal and returns 403", () => {
          expect(mockWriteGenericEventSuccess).toBeCalledWith({
            eventName: "DCMAW_ASYNC_CRI_4XXERROR",
            componentId: "mockIssuer",
            getNowInMilliseconds: Date.now,
            govukSigninJourneyId: expiredSessionAttributes.govukSigninJourneyId,
            sessionId: expiredSessionAttributes.sessionId,
            sub: expiredSessionAttributes.subjectIdentifier,
            transactionId: mockBiometricSessionId,
            extensions: {
              suspected_fraud_signal: "AUTH_SESSION_TOO_OLD",
            },
          });
          expect(result.statusCode).toBe(403);
        });
      });

      describe("and session is not expired", () => {
        const validSessionAttributes = {
          ...validBiometricSessionFinishedAttributes,
          createdAt: MOCK_VALID_TIME,
        };

        beforeEach(async () => {
          dependencies.getSessionRegistry = () => ({
            ...mockInertSessionRegistry,
            updateSession: jest.fn().mockResolvedValue(
              errorResult({
                errorType: UpdateSessionError.CONDITIONAL_CHECK_FAILURE,
                attributes: validSessionAttributes,
              }),
            ),
          });
          result = await lambdaHandlerConstructor(
            dependencies,
            validRequest,
            context,
          );
        });

        it("Writes event without fraud signal and returns 401", () => {
          expect(mockWriteGenericEventSuccess).toBeCalledWith({
            eventName: "DCMAW_ASYNC_CRI_4XXERROR",
            componentId: "mockIssuer",
            getNowInMilliseconds: Date.now,
            govukSigninJourneyId: validSessionAttributes.govukSigninJourneyId,
            sessionId: validSessionAttributes.sessionId,
            sub: validSessionAttributes.subjectIdentifier,
            transactionId: mockBiometricSessionId,
            extensions: undefined,
          });
          expect(result.statusCode).toBe(401);
        });
      });

      describe("and audit event write fails", () => {
        const validSessionAttributes = {
          ...validBiometricSessionFinishedAttributes,
          createdAt: MOCK_EXPIRED_TIME,
        };

        beforeEach(async () => {
          dependencies = {
            ...dependencies,
            getEventService: () => mockFailingEventService,
            getSessionRegistry: () => ({
              ...mockInertSessionRegistry,
              updateSession: jest.fn().mockResolvedValue(
                errorResult({
                  errorType: UpdateSessionError.CONDITIONAL_CHECK_FAILURE,
                  attributes: validSessionAttributes,
                }),
              ),
            }),
          };
          result = await lambdaHandlerConstructor(
            dependencies,
            validRequest,
            context,
          );
        });

        it("Logs audit event error and returns 500", () => {
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_ERROR_WRITING_AUDIT_EVENT",
            data: { auditEventName: "DCMAW_ASYNC_CRI_4XXERROR" },
          });
          expect(result.statusCode).toBe(500);
        });
      });
    });

    describe("When there is an internal server error", () => {
      describe("and audit event write fails", () => {
        beforeEach(async () => {
          dependencies = {
            ...dependencies,
            getEventService: () => mockFailingEventService,
            getSessionRegistry: () => ({
              ...mockInertSessionRegistry,
              updateSession: jest.fn().mockResolvedValue(
                errorResult({
                  errorType: UpdateSessionError.INTERNAL_SERVER_ERROR,
                }),
              ),
            }),
          };
          result = await lambdaHandlerConstructor(
            dependencies,
            validRequest,
            context,
          );
        });

        it("Logs audit event error and returns 500", () => {
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_ERROR_WRITING_AUDIT_EVENT",
            data: { auditEventName: "DCMAW_ASYNC_CRI_5XXERROR" },
          });
          expect(result.statusCode).toBe(500);
        });
      });

      describe("and audit event succeeds", () => {
        beforeEach(async () => {
          dependencies.getSessionRegistry = () => ({
            ...mockInertSessionRegistry,
            updateSession: jest.fn().mockResolvedValue(
              errorResult({
                errorType: UpdateSessionError.INTERNAL_SERVER_ERROR,
              }),
            ),
          });
          result = await lambdaHandlerConstructor(
            dependencies,
            validRequest,
            context,
          );
        });

        it("Writes error event and returns 500", () => {
          expect(mockWriteGenericEventSuccess).toBeCalledWith({
            eventName: "DCMAW_ASYNC_CRI_5XXERROR",
            componentId: "mockIssuer",
            getNowInMilliseconds: Date.now,
            govukSigninJourneyId: undefined,
            sessionId: mockSessionId,
            sub: undefined,
            transactionId: mockBiometricSessionId,
          });
          expect(result.statusCode).toBe(500);
        });
      });
    });
  });

  describe("Given sending message to vendor processing queue fails", () => {
    describe("Given sending DCMAW_ASYNC_CRI_5XXERROR event also fails", () => {
      beforeEach(async () => {
        dependencies = {
          ...dependencies,
          getSendMessageToSqs: () => mockFailingSendMessageToSqs,
          getEventService: () => mockFailingEventService,
        };

        result = await lambdaHandlerConstructor(
          dependencies,
          validRequest,
          context,
        );
      });

      it("Logs the send message to vendor processing queue failure", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_FINISH_BIOMETRIC_SESSION_SEND_MESSAGE_TO_VENDOR_PROCESSING_QUEUE_FAILURE",
        });
      });

      it("Logs the DCMAW_ASYNC_CRI_5XXERROR event failure", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_ERROR_WRITING_AUDIT_EVENT",
          data: {
            auditEventName: "DCMAW_ASYNC_CRI_5XXERROR",
          },
        });
      });

      it("Returns 500 Internal server error", () => {
        expect(result).toStrictEqual({
          statusCode: 500,
          body: JSON.stringify({
            error: "server_error",
            error_description: "Internal Server Error",
          }),
          headers: expectedSecurityHeaders,
        });
      });
    });

    describe("Given DCMAW_ASYNC_CRI_5XXERROR event successfully writes to TxMA", () => {
      beforeEach(async () => {
        dependencies = {
          ...dependencies,
          getSendMessageToSqs: () => mockFailingSendMessageToSqs,
        };
        result = await lambdaHandlerConstructor(
          dependencies,
          validRequest,
          context,
        );
      });

      it("Logs the send message to vendor processing queue failure", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_FINISH_BIOMETRIC_SESSION_SEND_MESSAGE_TO_VENDOR_PROCESSING_QUEUE_FAILURE",
        });
      });

      it("Writes DCMAW_ASYNC_CRI_5XXERROR event", () => {
        expect(mockWriteGenericEventSuccess).toBeCalledWith({
          eventName: "DCMAW_ASYNC_CRI_5XXERROR",
          componentId: "mockIssuer",
          getNowInMilliseconds: Date.now,
          govukSigninJourneyId: "mockGovukSigninJourneyId",
          sessionId: "mockSessionId",
          sub: "mockSubjectIdentifier",
          transactionId: mockBiometricSessionId,
          ipAddress: "1.1.1.1",
          txmaAuditEncoded: "mockTxmaAuditEncodedHeader",
        });
      });

      it("Returns 500 Internal server error", () => {
        expect(result).toStrictEqual({
          statusCode: 500,
          body: JSON.stringify({
            error: "server_error",
            error_description: "Internal Server Error",
          }),
          headers: expectedSecurityHeaders,
        });
      });
    });
  });

  describe("Given a valid request is made", () => {
    beforeEach(async () => {
      result = await lambdaHandlerConstructor(
        dependencies,
        validRequest,
        context,
      );
    });

    it("Sends message to the Vendor Processing queue", () => {
      expect(mockSuccessfulSendMessageToSqs).toHaveBeenCalledWith(
        "mockVendorProcessingSqs",
        {
          biometricSessionId: mockBiometricSessionId,
          sessionId: mockSessionId,
        },
      );
    });

    it("Logs COMPLETED", async () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_FINISH_BIOMETRIC_SESSION_COMPLETED",
      });
    });

    it("Returns 501 Not Implemented response", async () => {
      expect(result).toStrictEqual({
        headers: expectedSecurityHeaders,
        statusCode: 501,
        body: JSON.stringify({ error: "Not Implemented" }),
      });
    });
  });
});
