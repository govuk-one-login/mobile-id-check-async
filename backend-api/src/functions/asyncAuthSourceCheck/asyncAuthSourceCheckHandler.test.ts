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
  let consoleErrorSpy: MockInstance;
  let consoleInfoSpy: MockInstance;
  let result: APIGatewayProxyResult;

  beforeEach(() => {
    context = buildLambdaContext();
    consoleErrorSpy = vi.spyOn(console, "error");
    consoleInfoSpy = vi.spyOn(console, "info");
  });

  describe("On every invocation", () => {
    const iphoneUserAgent =
      "OneLogin/1.9.0 iPhone14,3 iOS/16.4 CFNetwork/1.2.3 Darwin/4.5.6";

    describe("With an valid request to DVLA", () => {
      beforeEach(async () => {
        result = await lambdaHandlerConstructor(
          {
            ...validDvlaRequest,
            headers: { "User-Agent": iphoneUserAgent },
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

      it("Logs a completion code", () => {
        expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_AUTH_SOURCE_CHECK_COMPLETED",
        });
      });

      it("Returns a NotImplemented status", () => {
        expect(result.statusCode).toEqual(501);
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
    });
  });
});

const invalidPartialRequest = buildRequest({
  body: JSON.stringify({
    sessionId: "fe4b8e97-fe75-4a61-b85e-f0a2c5cea446",
    opaqueId: "4c5f83fc-4fae-41bf-88f9-03730119c77f",
    userSurname: "DECERQUEIRA",
    userForenames: ["KENNETH"],
    userDateOfBirth: "1965-07-08",
    // validFrom should come next, causing a 'field missing' validation error.
  }),
});

const validDvlaRequest = buildRequest({
  body: JSON.stringify({
    sessionId: "fe4b8e97-fe75-4a61-b85e-f0a2c5cea446",
    opaqueId: "4c5f83fc-4fae-41bf-88f9-03730119c77f",
    userSurname: "DECERQUEIRA",
    userForenames: ["KENNETH"],
    userDateOfBirth: "1965-07-08",
    validFrom: "2018-01-01",
    validUntil: "2027-12-31",
    issuingAuthority: "DVLA",
    licenceNumber: "DECER607085K912305",
    postcode: "BA2 5AA",
  }),
});
