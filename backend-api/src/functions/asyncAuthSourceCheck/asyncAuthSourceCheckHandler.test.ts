import { APIGatewayProxyResult, Context } from "aws-lambda";
import "../../../tests/testUtils/matchers";
import { buildLambdaContext } from "../testUtils/mockContext";
import { buildRequest } from "../testUtils/mockRequest";
import { lambdaHandlerConstructor } from "./asyncAuthSourceCheckHandler";
import {
  vi,
  expect,
  it,
  beforeEach,
  describe,
  type MockInstance,
} from "vitest";

describe("Async Authoritative Source Check", () => {
  let context: Context;
  let consoleInfoSpy: MockInstance;
  let result: APIGatewayProxyResult;

  beforeEach(() => {
    context = buildLambdaContext();
    consoleInfoSpy = vi.spyOn(console, "info");
  });

  describe("On every invocation", () => {
    const iphoneUserAgent =
      "OneLogin/1.9.0 iPhone14,3 iOS/16.4 CFNetwork/1.2.3 Darwin/4.5.6";

    beforeEach(async () => {
      result = await lambdaHandlerConstructor(
        {
          ...validRequest,
          ...{ headers: { "User-Agent": iphoneUserAgent } },
        },
        context,
      );
    });

    it("Adds context, version and User-Agent to log attributes and logs STARTED message", () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_AUTH_SOURCE_CHECK_STARTED",
        functionVersion: "1",
        function_arn: "arn:12345",
        userAgent: {
          userAgentHeader: iphoneUserAgent,
          deviceType: "iPhone",
        },
      });
    });

    it("Returns a NotImplemented status code", () => {
      expect(result.statusCode).toEqual(501);
    });
  });
});

const validRequest = buildRequest({
  body: JSON.stringify({}),
});
