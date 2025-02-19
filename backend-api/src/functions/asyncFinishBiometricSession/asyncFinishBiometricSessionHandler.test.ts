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
  validBiometricTokenIssuedSessionAttributes,
  validBiometricSessionFinishedAttributes,
} from "../testUtils/unitTestData";
import { emptySuccess, successResult, errorResult } from "../utils/result";
import { UpdateSessionError } from "../common/session/SessionRegistry";

describe("Async Finish Biometric Session", () => {
  let dependencies: IAsyncFinishBiometricSessionDependencies;
  let context: Context;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let result: APIGatewayProxyResult;

  const validRequest = buildRequest({
    body: JSON.stringify({
      sessionId: mockSessionId,
      biometricSessionId: mockBiometricSessionId,
    }),
  });

  const mockWriteBiometricSessionFinishedEventSuccess = jest
    .fn()
    .mockResolvedValue(emptySuccess());

  const mockSuccessfulEventService = {
    ...mockInertEventService,
    writeBiometricSessionFinishedEvent:
      mockWriteBiometricSessionFinishedEventSuccess,
  };

  const mockSessionUpdateSuccess = jest
    .fn()
    .mockResolvedValue(successResult(validBiometricSessionFinishedAttributes));

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
  });

  describe("On every invocation", () => {
    beforeEach(async () => {
      result = await lambdaHandlerConstructor(
        dependencies,
        validRequest,
        context,
      );
    });

    it("Adds context to log attributes and logs STARTED message", () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_FINISH_BIOMETRIC_SESSION_STARTED",
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
        expect(mockWriteBiometricSessionFinishedEventSuccess).toBeCalledWith({
          eventName: "DCMAW_ASYNC_CRI_4XXERROR",
          componentId: "mockIssuer",
          getNowInMilliseconds: Date.now,
          govukSigninJourneyId: undefined,
          sessionId: mockSessionId,
          sub: undefined,
          transactionId: mockBiometricSessionId,
          extensions: {
            suspected_fraud_signal: "AUTH_SESSION_NOT_FOUND",
          },
        });
        expect(result.statusCode).toBe(401);
      });
    });

    describe("When session is expired", () => {
      const expiredSessionAttributes = {
        ...validBiometricTokenIssuedSessionAttributes,
        createdAt: Date.now() - 61 * 60 * 1000,
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
        expect(mockWriteBiometricSessionFinishedEventSuccess).toBeCalledWith({
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

    describe("When there is an internal server error", () => {
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
        expect(mockWriteBiometricSessionFinishedEventSuccess).toBeCalledWith({
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

  describe("Given a valid request is made", () => {
    beforeEach(async () => {
      result = await lambdaHandlerConstructor(
        dependencies,
        validRequest,
        context,
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
