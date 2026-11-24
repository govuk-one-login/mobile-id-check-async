import { APIGatewayProxyResult, Context } from "aws-lambda";
import "../../../tests/testUtils/matchers";
import { buildLambdaContext } from "../testUtils/mockContext";
import { buildRequest } from "../testUtils/mockRequest";
import {
  mockSessionId,
  validAuthSourceCheckRequestBody,
} from "../testUtils/unitTestData";
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
  let consoleErrorSpy: MockInstance;
  let consoleInfoSpy: MockInstance;
  let result: APIGatewayProxyResult;

  beforeEach(() => {
    context = buildLambdaContext();
    consoleErrorSpy = vi.spyOn(console, "error");
    consoleInfoSpy = vi.spyOn(console, "info");
  });

  describe("On every lambda invocation", () => {
    const iphoneUserAgent =
      "OneLogin/1.9.0 iPhone14,3 iOS/16.4 CFNetwork/1.2.3 Darwin/4.5.6";

    beforeEach(async () => {
      result = await lambdaHandlerConstructor(
        {
          ...validRequest,
          headers: { "User-Agent": iphoneUserAgent },
        },
        context,
      );
    });

    it("Logs a STARTED message, including version and User-Agent", () => {
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

    describe("With an invalid request that fails schema validation", () => {
      beforeEach(async () => {
        result = await lambdaHandlerConstructor(
          {
            ...invalidPartialRequest,
            headers: { "User-Agent": iphoneUserAgent },
          },
          context,
        );
      });

      it("Logs an error code", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_AUTH_SOURCE_CHECK_REQUEST_BODY_INVALID",
          errorMessage:
            "validFrom in request body is either null or undefined.",
        });
      });

      it("Returns a ClientError status", () => {
        expect(result.statusCode).toEqual(400);
      });

      it("Returns an error JSON body", () => {
        expect(result.body).toEqual(
          JSON.stringify({
            error: "invalid_request",
            error_description:
              "validFrom in request body is either null or undefined.",
          }),
        );
      });
    });

    describe("With an valid request", () => {
      it("Logs a completion code", () => {
        expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_AUTH_SOURCE_CHECK_COMPLETED",
        });
      });

      it("Returns a NotImplemented status", () => {
        expect(result.statusCode).toEqual(501);
      });
    });
  });
});

const invalidPartialRequest = buildRequest({
  body: JSON.stringify({
    sessionId: mockSessionId,
    userSurname: "DECERQUEIRA",
    userForenames: ["KENNETH"],
    userDateOfBirth: "1965-07-08",
    // validFrom should come next, causing a 'field missing' validation error.
  }),
});

const validRequest = buildRequest({
  body: JSON.stringify(validAuthSourceCheckRequestBody),
});
