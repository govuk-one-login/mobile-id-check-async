import { expect } from "@jest/globals";
import { APIGatewayProxyResult, Context } from "aws-lambda";
import "../../../tests/testUtils/matchers";
import { logger } from "../common/logging/logger";
import { buildLambdaContext } from "../testUtils/mockContext";
import { buildRequest } from "../testUtils/mockRequest";
import { expectedSecurityHeaders } from "../testUtils/unitTestData";
import { lambdaHandlerConstructor } from "./asyncTxmaEventHandler";
import { IAsyncTxmaEventDependencies } from "./handlerDependencies";

describe("Async TxMA Event", () => {
  let dependencies: IAsyncTxmaEventDependencies;
  let context: Context;
  let consoleInfoSpy: jest.SpyInstance;
  let result: APIGatewayProxyResult;

  const request = buildRequest();

  beforeEach(() => {
    dependencies = {
      env: {},
    };
    context = buildLambdaContext();
    consoleInfoSpy = jest.spyOn(console, "info");
  });

  describe("On every invocation", () => {
    beforeEach(async () => {
      result = await lambdaHandlerConstructor(dependencies, request, context);
    });

    it("Adds context to log attributes and logs STARTED message", () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_TXMA_EVENT_STARTED",
        function_arn: "arn:12345", // example field to verify that context has been added
      });
    });

    it("Clears pre-existing log attributes", async () => {
      logger.appendKeys({ testKey: "testValue" });
      result = await lambdaHandlerConstructor(dependencies, request, context);
      expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
        testKey: "testValue",
      });
    });
  });

  describe("Given a valid request is made", () => {
    beforeEach(async () => {
      result = await lambdaHandlerConstructor(dependencies, request, context);
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
