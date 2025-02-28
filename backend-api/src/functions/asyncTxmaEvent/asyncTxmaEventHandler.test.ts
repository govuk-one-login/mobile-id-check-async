import { expect } from "@jest/globals";
import { APIGatewayProxyResult, Context } from "aws-lambda";
import "../../../tests/testUtils/matchers";
import { logger } from "../common/logging/logger";
import { buildLambdaContext } from "../testUtils/mockContext";
import { buildRequest } from "../testUtils/mockRequest";
import {
  expectedSecurityHeaders,
  mockSessionId,
} from "../testUtils/unitTestData";
import { lambdaHandlerConstructor } from "./asyncTxmaEventHandler";
import { IAsyncTxmaEventDependencies } from "./handlerDependencies";

describe("Async TxMA Event", () => {
  let dependencies: IAsyncTxmaEventDependencies;
  let context: Context;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let result: APIGatewayProxyResult;

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
      result = await lambdaHandlerConstructor(
        dependencies,
        validRequest,
        context,
      );
    });

    it("Adds context to log attributes and logs STARTED message", () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_TXMA_EVENT_STARTED",
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
