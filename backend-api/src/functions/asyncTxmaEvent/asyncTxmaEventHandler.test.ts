import { expect } from "@jest/globals";
import { APIGatewayProxyResult, Context } from "aws-lambda";
import "../../../tests/testUtils/matchers";
import { logger } from "../common/logging/logger";
import { buildLambdaContext } from "../testUtils/mockContext";
import { buildRequest } from "../testUtils/mockRequest";
import {
  expectedSecurityHeaders,
  mockInertEventService,
  mockInertSessionRegistry,
  mockSessionId,
  mockSuccessfulEventService,
  mockSuccessfulSessionRegistry,
  mockWriteGenericEventSuccessResult,
} from "../testUtils/unitTestData";
import { lambdaHandlerConstructor } from "./asyncTxmaEventHandler";
import { IAsyncTxmaEventDependencies } from "./handlerDependencies";
import { GetSessionError } from "../common/session/SessionRegistry";
import { errorResult } from "../utils/result";

describe("Async TxMA Event", () => {
  let dependencies: IAsyncTxmaEventDependencies;
  let context: Context;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let result: APIGatewayProxyResult;

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

    it("Adds context and version to log attributes and logs STARTED message", () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_TXMA_EVENT_STARTED",
        functionVersion: "1",
        function_arn: "arn:12345", // example field to verify that context has been added
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
    describe.each(["SESSION_TABLE_NAME"])(
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
            messageCode: "MOBILE_ASYNC_TXMA_EVENT_INVALID_CONFIG",
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
            sessionId: mockSessionId,
            eventName: "INVALID_EVENT_NAME",
          }),
        });
        result = await lambdaHandlerConstructor(dependencies, request, context);
      });

      it("Logs the error", async () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_TXMA_EVENT_REQUEST_BODY_INVALID",
          errorMessage:
            "eventName in request body is invalid. eventName: INVALID_EVENT_NAME",
        });
      });

      it("Returns 400 Bad Request response", async () => {
        expect(result).toStrictEqual({
          headers: expectedSecurityHeaders,
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description:
              "eventName in request body is invalid. eventName: INVALID_EVENT_NAME",
          }),
        });
      });
    });
  });

  describe("Retrieving a session", () => {
    describe("Given there is an error retrieving the session", () => {
      beforeEach(async () => {
        dependencies.getSessionRegistry = () => ({
          ...mockInertSessionRegistry,
          getSession: jest.fn().mockResolvedValue(
            errorResult({
              errorType: GetSessionError.INTERNAL_SERVER_ERROR,
            }),
          ),
        });
        result = await lambdaHandlerConstructor(
          dependencies,
          validRequest,
          context,
        );
      });

      describe("Given DCMAW_ASYNC_CRI_5XXERROR event fails to write to TxMA", () => {
        beforeEach(async () => {
          dependencies.getEventService = () => ({
            ...mockInertEventService,
            writeGenericEvent: jest.fn().mockResolvedValue(
              errorResult({
                errorMessage: "mockError",
              }),
            ),
          });

          result = await lambdaHandlerConstructor(
            dependencies,
            validRequest,
            context,
          );
        });

        it("Logs the error", async () => {
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_ERROR_WRITING_AUDIT_EVENT",
            data: {
              auditEventName: "DCMAW_ASYNC_CRI_5XXERROR",
            },
          });
        });

        it("Returns 500 Internal server error", async () => {
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

      describe("Given DCMAW_ASYNC_CRI_5XXERROR event successfully to write to TxMA", () => {
        it("Writes DCMAW_ASYNC_CRI_5XXERROR event to TxMA", () => {
          expect(mockWriteGenericEventSuccessResult).toBeCalledWith({
            eventName: "DCMAW_ASYNC_CRI_5XXERROR",
            componentId: "mockIssuer",
            getNowInMilliseconds: Date.now,
            govukSigninJourneyId: undefined,
            sessionId: mockSessionId,
            sub: undefined,
            ipAddress: "1.1.1.1",
            txmaAuditEncoded: "mockTxmaAuditEncodedHeader",
          });
        });

        it("Returns 500 Internal server error", async () => {
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

    describe("Given failure is due to client error", () => {
      describe("Given session was not found", () => {
        beforeEach(async () => {
          dependencies.getSessionRegistry = () => ({
            ...mockInertSessionRegistry,
            getSession: jest.fn().mockResolvedValue(
              errorResult({
                errorType: GetSessionError.SESSION_NOT_FOUND,
              }),
            ),
          });
          result = await lambdaHandlerConstructor(
            dependencies,
            validRequest,
            context,
          );
        });

        describe("Given DCMAW_ASYNC_CRI_4XXERROR event fails to write to TxMA", () => {
          beforeEach(async () => {
            dependencies.getEventService = () => ({
              ...mockInertEventService,
              writeGenericEvent: jest.fn().mockResolvedValue(
                errorResult({
                  errorMessage: "mockError",
                }),
              ),
            });

            result = await lambdaHandlerConstructor(
              dependencies,
              validRequest,
              context,
            );
          });

          it("Logs the error", async () => {
            expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
              messageCode: "MOBILE_ASYNC_ERROR_WRITING_AUDIT_EVENT",
              data: {
                auditEventName: "DCMAW_ASYNC_CRI_4XXERROR",
              },
            });
          });

          it("Returns 500 Internal Server Error ", async () => {
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

        it("Writes DCMAW_ASYNC_CRI_4XXERROR event to TxMA", () => {
          expect(mockWriteGenericEventSuccessResult).toBeCalledWith({
            eventName: "DCMAW_ASYNC_CRI_4XXERROR",
            componentId: "mockIssuer",
            getNowInMilliseconds: Date.now,
            govukSigninJourneyId: undefined,
            sessionId: mockSessionId,
            sub: undefined,
            ipAddress: "1.1.1.1",
            txmaAuditEncoded: "mockTxmaAuditEncodedHeader",
          });
        });

        it("Returns 401 Unauthorized", () => {
          expect(result).toStrictEqual({
            statusCode: 401,
            body: JSON.stringify({
              error: "invalid_session",
              error_description: "Session does not exist or in incorrect state",
            }),
            headers: expectedSecurityHeaders,
          });
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

    it("Logs COMPLETED", () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_TXMA_EVENT_COMPLETED",
      });
    });

    it("Returns 501 Not Implemented response", () => {
      expect(result).toStrictEqual({
        headers: expectedSecurityHeaders,
        statusCode: 501,
        body: JSON.stringify({ error: "Not Implemented" }),
      });
    });
  });
});

const validRequest = buildRequest({
  body: JSON.stringify({
    sessionId: mockSessionId,
    eventName: "DCMAW_ASYNC_HYBRID_BILLING_STARTED",
  }),
});
