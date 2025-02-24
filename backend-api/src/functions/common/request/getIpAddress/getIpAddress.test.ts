import { APIGatewayProxyEvent } from "aws-lambda";
import { getIpAddress } from "./getIpAddress";
import { buildRequest } from "../../../testUtils/mockRequest";
import { expect } from "@jest/globals";
import "../../../../../tests/testUtils/matchers";

let request: APIGatewayProxyEvent;
let consoleWarnSpy: jest.SpyInstance;
let result: string;

const validCloudfrontHeaderScenarios = [
  {
    scenario:
      "Given the event contains the cloudfront-viewer-address with an IPV4 address without a port",
    expectedOutcome: "Returns the IPV4 Address from this header",
    headerValue: "127.0.0.1",
    expectedIpAddress: "127.0.0.1",
  },
  {
    scenario:
      "Given the event contains the cloudfront-viewer-address with an IPV4 address with a port",
    expectedOutcome:
      "Returns the IPV4 Address from this header with the port number truncated",
    headerValue: "127.0.0.1:8080",
    expectedIpAddress: "127.0.0.1",
  },
  {
    scenario:
      "Given the event contains the cloudfront-viewer-address with an IPV6 address without a port",
    expectedOutcome: "Returns the IPV6 Address from this header",
    headerValue: "[2001:0db8:85a3:0000:0000:8a2e:0370:7334]",
    expectedIpAddress: "2001:db8:85a3::8a2e:370:7334",
  },
  {
    scenario:
      "Given the event contains the cloudfront-viewer-address with an IPV6 address with a port",
    expectedOutcome:
      "Returns the IPV6 Address from this header with the port number truncated",
    headerValue: "[2001:0db8:85a3:0000:0000:8a2e:0370:7334]:8080",
    expectedIpAddress: "2001:db8:85a3::8a2e:370:7334",
  },
  {
    scenario:
      "Given the event contains the cloudfront-viewer-address with an IPV6 address with uppercase characters",
    expectedOutcome:
      "Returns the IPV6 Address from this header with uppercase characters transformed to lowercase",
    headerValue: "[2001:0DB8:85A3:0000:0000:8A2E:0370:7334]",
    expectedIpAddress: "2001:db8:85a3::8a2e:370:7334",
  },
  {
    scenario:
      "Given the event contains the cloudfront-viewer-address with an IPV6 address with leading zeros",
    expectedOutcome:
      "Returns the IPV6 Address from this header with leading zeros repressed",
    headerValue: "[2001:0db8::0001:0000]",
    expectedIpAddress: "2001:db8::1:0",
  },
  {
    scenario:
      "Given the event contains the cloudfront-viewer-address with an IPV6 address with consecutive all-zero fields",
    expectedOutcome:
      "Returns the IPV6 Address from this header with the longest sequence of consecutive all-zero fields replaced by two colons",
    headerValue: "[2001:db8:0:0:1:0:0:1]",
    expectedIpAddress: "2001:db8::1:0:0:1",
  },
];

describe("getIpFromRequest", () => {
  beforeEach(() => {
    request = buildRequest();
    consoleWarnSpy = jest.spyOn(console, "warn");
  });
  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe.each(validCloudfrontHeaderScenarios)(
    "$scenario",
    ({ expectedOutcome, headerValue, expectedIpAddress }) => {
      beforeEach(() => {
        request.headers["cloudfront-viewer-address"] = headerValue;
      });
      it(expectedOutcome, () => {
        expect(getIpAddress(request)).toEqual(expectedIpAddress);
      });
    },
  );

  describe("Given the event contains the cloudfront-viewer-address with a malformed IPV4", () => {
    beforeEach(() => {
      request.headers["cloudfront-viewer-address"] = "33.3333.33.3";
      result = getIpAddress(request);
    });

    it("Retrieves the IP Address from event.requestContext.identity.sourceIp", () => {
      expect(result).toEqual("1.1.1.1");
    });

    it("logs IP_NOT_RETRIEVED_FROM_VIEWER_ADDRESS", async () => {
      expect(consoleWarnSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_IP_ADDRESS_FROM_CLOUDFRONT_IS_MALFORMED",
      });
    });
  });

  describe("Given the event contains the cloudfront-viewer-address with a malformed IPV6 address", () => {
    beforeEach(() => {
      request.headers["cloudfront-viewer-address"] = "2001:db8:0:0:1:0:0:1";
      result = getIpAddress(request);
    });

    it("Retrieves the IP Address from event.requestContext.identity.sourceIp", () => {
      expect(result).toEqual("1.1.1.1");
    });

    it("logs IP_NOT_RETRIEVED_FROM_VIEWER_ADDRESS", async () => {
      expect(consoleWarnSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_IP_ADDRESS_FROM_CLOUDFRONT_IS_MALFORMED",
      });
    });
  });

  describe("Given the event does not contain the cloudfront-viewer-address", () => {
    it("Gets the IP Address from event.requestContext.identity.sourceIp", () => {
      expect(getIpAddress(request)).toEqual("1.1.1.1");
    });
  });
});
