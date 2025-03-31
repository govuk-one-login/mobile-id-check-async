import { APIGatewayProxyResult, Context } from "aws-lambda";
import { expect } from "@jest/globals";
import "../../../tests/testUtils/matchers";
import { IAsyncAbortSessionDependencies } from "./handlerDependencies";
import { buildLambdaContext } from "../testUtils/mockContext";
import { lambdaHandlerConstructor } from "./asyncAbortSessionHandler";
import { buildRequest } from "../testUtils/mockRequest";
import { logger } from "../common/logging/logger";
import {
  expectedSecurityHeaders,
  mockInvalidUUID,
  mockSessionId,
  mockInertSessionRegistry,
  mockInertEventService,
  validAbortSessionAttributes,
  NOW_IN_MILLISECONDS,
  invalidCreatedAt,
  validCreatedAt,
} from "../testUtils/unitTestData";
import { emptySuccess, successResult, errorResult } from "../utils/result";
import { UpdateSessionError } from "../common/session/SessionRegistry";

describe("Async Abort Session", () => {
  let dependencies: IAsyncAbortSessionDependencies;
  let context: Context;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let result: APIGatewayProxyResult;

  const validRequest = buildRequest({
    body: JSON.stringify({
      sessionId: mockSessionId,
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

  const mockSessionUpdateSuccess = jest.fn().mockResolvedValue(
    successResult({
      attributes: validAbortSessionAttributes,
    }),
  );

  const mockSuccessfulSessionRegistry = {
    ...mockInertSessionRegistry,
    updateSession: mockSessionUpdateSuccess,
  };

  beforeEach(() => {
    dependencies = {
      env: {
        SESSION_TABLE_NAME: "mockTableName",
        TXMA_SQS: "mockTxmaSqs",
        ISSUER: "mockIssuer",
      },
      getSessionRegistry: () => mockSuccessfulSessionRegistry,
      getEventService: () => mockSuccessfulEventService,
    };

    context = buildLambdaContext();
    consoleInfoSpy = jest.spyOn(console, "info");
    consoleErrorSpy = jest.spyOn(console, "error");
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("On every invocation", () => {
    beforeEach(async () => {
      await lambdaHandlerConstructor(dependencies, validRequest, context);
    });

    it("Adds context and version to log attributes and logs STARTED message", () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_ABORT_SESSION_STARTED",
        functionVersion: "1",
        function_arn: "arn:12345",
      });
    });

    it("Clears pre-existing log attributes", async () => {
      logger.appendKeys({ testKey: "testValue" });
      await lambdaHandlerConstructor(dependencies, validRequest, context);
      expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
        testKey: "testValue",
      });
    });
  });

  describe("Config validation", () => {
    describe.each([["SESSION_TABLE_NAME"], ["TXMA_SQS"], ["ISSUER"]])(
      "Given %s environment variable is missing",
      (envVar: string) => {
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
            messageCode: "MOBILE_ASYNC_ABORT_SESSION_INVALID_CONFIG",
            data: {
              missingEnvironmentVariables: [envVar],
            },
          });
        });
      },
    );
  });

  describe("Request body validation", () => {
    describe("Given request body is invalid", () => {
      beforeEach(async () => {
        const request = buildRequest({
          body: JSON.stringify({
            sessionId: mockInvalidUUID,
          }),
        });
        result = await lambdaHandlerConstructor(dependencies, request, context);
      });

      it("Logs the error", async () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_ABORT_SESSION_REQUEST_BODY_INVALID",
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
            ipAddress: "1.1.1.1",
            txmaAuditEncoded: "mockTxmaAuditEncodedHeader",
            redirect_uri: undefined,
            suspected_fraud_signal: undefined,
          });
          expect(result.statusCode).toBe(401);
        });
      });
    });

    describe("When session fails conditional check", () => {
      describe("and session is expired", () => {
        const expiredSessionAttributes = {
          ...validAbortSessionAttributes,
          createdAt: invalidCreatedAt,
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

        it("Writes fraud signal and returns 401", () => {
          expect(mockWriteGenericEventSuccess).toBeCalledWith({
            eventName: "DCMAW_ASYNC_CRI_4XXERROR",
            componentId: "mockIssuer",
            getNowInMilliseconds: Date.now,
            govukSigninJourneyId: expiredSessionAttributes.govukSigninJourneyId,
            sessionId: expiredSessionAttributes.sessionId,
            sub: expiredSessionAttributes.subjectIdentifier,
            suspected_fraud_signal: "AUTH_SESSION_TOO_OLD",
            ipAddress: "1.1.1.1",
            txmaAuditEncoded: "mockTxmaAuditEncodedHeader",
          });
          expect(result.statusCode).toBe(401);
        });
      });

      describe("and session is not expired", () => {
        const validSessionAttributes = {
          ...validAbortSessionAttributes,
          createdAt: validCreatedAt,
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
            ipAddress: "1.1.1.1",
            txmaAuditEncoded: "mockTxmaAuditEncodedHeader",
            extensions: undefined,
          });
          expect(result.statusCode).toBe(401);
        });
      });

      describe("and audit event write fails", () => {
        const validSessionAttributes = {
          ...validAbortSessionAttributes,
          createdAt: invalidCreatedAt,
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
            ipAddress: "1.1.1.1",
            txmaAuditEncoded: "mockTxmaAuditEncodedHeader",
          });
          expect(result.statusCode).toBe(500);
        });
      });
    });
  });

  describe("Given a request containing a valid sessionId is made", () => {
    beforeEach(async () => {
      result = await lambdaHandlerConstructor(
        dependencies,
        validRequest,
        context,
      );
    });

    it("Logs COMPLETED", async () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_ABORT_SESSION_COMPLETED",
      });
    });

    it("Returns 501 Not Implemented response", async () => {
      expect(result).toStrictEqual({
        headers: expectedSecurityHeaders,
        statusCode: 501,
        body: JSON.stringify({
          error: "Not Implemented",
        }),
      });
    });
  });
});
