import { APIGatewayProxyResult, Context } from "aws-lambda";
import { ITestSessionsDependencies } from "./handlerDependencies";
import { buildRequest } from "../testUtils/mockRequest";
import { buildLambdaContext } from "../testUtils/mockContext";
import { lambdaHandlerConstructor } from "./testSessionsHandler";
import { logger } from "../common/logging/logger";
import {
  expectedSecurityHeaders,
  mockSessionId,
} from "../testUtils/unitTestData";
import { expect } from "@jest/globals";
import "../testUtils/matchers";

describe("Test sessions handler", () => {
  let dependencies: ITestSessionsDependencies;
  let context: Context;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let result: APIGatewayProxyResult;

  const validRequest = buildRequest({
    pathParameters: { sessionId: mockSessionId },
  });

  beforeEach(() => {
    dependencies = {
      env: {
        SESSIONS_TABLE_NAME: "mockTableName",
      },
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
        messageCode: "MOBILE_ASYNC_TEST_SESSIONS_STARTED",
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

  describe("Request validation", () => {
    describe("Given there are no path parameters", () => {
      beforeEach(async () => {
        result = await lambdaHandlerConstructor(
          dependencies,
          buildRequest(),
          context,
        );
      });

      it("Logs an error", async () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_TEST_SESSIONS_REQUEST_PATH_PARAM_INVALID",
        });
      });

      it("returns a 400 Bad Request error", async () => {
        expect(result).toStrictEqual({
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "missing sessionId path parameter",
          }),
          headers: expectedSecurityHeaders,
        });
      });
    });
    describe("Given there is no sessionId path parameter", () => {
      beforeEach(async () => {
        const request = {
          ...validRequest,
          ...{ pathParameters: { mockPathParameter: "mockPathParameter" } },
        };

        result = await lambdaHandlerConstructor(dependencies, request, context);
      });

      it("Logs an error", async () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_TEST_SESSIONS_REQUEST_PATH_PARAM_INVALID",
          pathParameters: { mockPathParameter: "mockPathParameter" },
        });
      });

      it("returns a 400 Bad Request error", async () => {
        expect(result).toStrictEqual({
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "missing sessionId path parameter",
          }),
          headers: expectedSecurityHeaders,
        });
      });
    });
  });

  describe("Happy path", () => {
    describe("Given there is a valid request", () => {
      beforeEach(async () => {
        result = await lambdaHandlerConstructor(
          dependencies,
          validRequest,
          context,
        );
      });

      it("Logs", async () => {
        expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_TEST_SESSIONS_COMPLETED",
        });
      });

      it("Returns a 501 Not Implemented response", async () => {
        expect(result).toStrictEqual({
          headers: expectedSecurityHeaders,
          statusCode: 501,
          body: "Not Implemented",
        });
      });
    });
  });
});
