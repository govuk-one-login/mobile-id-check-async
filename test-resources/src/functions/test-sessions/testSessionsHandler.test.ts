import { APIGatewayProxyResult, Context } from "aws-lambda";
import { ITestSessionsDependencies } from "./handlerDependencies";
import { buildRequest } from "../testUtils/mockRequest";
import { SessionRegistry } from "../common/session/SessionRegistry";
import { emptySuccess } from "../common/utils/result";
import { buildLambdaContext } from "../testUtils/mockContext";
import { lambdaHandlerConstructor } from "./testSessionsHandler";
import { logger } from "../common/logging/logger";
import {
  expectedSecurityHeaders,
  mockSessionId,
  NOW_IN_MILLISECONDS,
  validBaseSessionAttributes,
} from "../testUtils/unitTestData";
import { expect } from "@jest/globals";
import "../testUtils/matchers";

export const mockInertSessionRegistry: SessionRegistry = {
  createSession: jest.fn(() => {
    throw new Error("Not implemented");
  }),
};

const mockSessionUpdateSuccess = jest.fn().mockResolvedValue(emptySuccess());

const mockSuccessfulSessionRegistry = {
  ...mockInertSessionRegistry,
  updateSession: mockSessionUpdateSuccess,
};

describe("Test sessions handler", () => {
  let dependencies: ITestSessionsDependencies;
  let context: Context;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let result: APIGatewayProxyResult;

  const validRequest = buildRequest({
    body: JSON.stringify(validBaseSessionAttributes),
    pathParameters: { sessionId: mockSessionId },
  });

  beforeEach(() => {
    dependencies = {
      env: {
        SESSIONS_TABLE_NAME: "mockTableName",
      },
      getSessionRegistry: () => mockSuccessfulSessionRegistry,
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

  describe("Config validation", () => {
    describe.each([["SESSIONS_TABLE_NAME"]])(
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
            messageCode: "MOBILE_ASYNC_TEST_SESSIONS_INVALID_CONFIG",
            data: {
              missingEnvironmentVariables: [envVar],
            },
          });
        });
      },
    );
  });

  describe("Request validation", () => {
    describe("Given there are no path parameters", () => {
      beforeEach(async () => {
        result = await lambdaHandlerConstructor(
          dependencies,
          validRequest,
          context,
        );
      });
      {
        it("Logs an error", async () => {
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode:
              "MOBILE_ASYNC_TEST_SESSIONS_REQUEST_PATH_PARAM_INVALID",
          });
        });
      }
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
    });
  });

  describe("Happy path", () => {
    describe("Given the session is written to Dynamo", () => {
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
      it("Returns a 501 Not Implemented", async () => {
        expect(result.statusCode).toBe(501);
        expect(result.body).toBe("Not Implemented");
      });
    });
  });
});
