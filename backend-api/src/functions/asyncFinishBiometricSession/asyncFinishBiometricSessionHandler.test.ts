import { APIGatewayProxyResult, Context } from "aws-lambda";
import { expect } from "@jest/globals";
import "../../../tests/testUtils/matchers";
import "dotenv/config";
import { IAsyncFinishBiometricSessionDependencies } from "./handlerDenpendencies";
import { buildLambdaContext } from "../testUtils/mockContext";
import { lambdaHandlerConstructor } from "./asyncFinishBiometricSessionHandler";
import { buildRequest } from "../testUtils/mockRequest";
import { logger } from "../common/logging/logger";
import { expectedSecurityHeaders } from "../testUtils/unitTestData";

describe("Async Finish Biometric Session", () => {
  let dependencies: IAsyncFinishBiometricSessionDependencies;
  let context: Context;
  let consoleInfoSpy: jest.SpyInstance;
  let result: APIGatewayProxyResult;

  const validRequest = buildRequest();

  beforeEach(() => {
    dependencies = {
      env: {},
    };
    context = buildLambdaContext();
    consoleInfoSpy = jest.spyOn(console, "info");
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

  describe("Given a request is made", () => {
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
