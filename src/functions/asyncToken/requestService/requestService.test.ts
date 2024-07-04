import { IProcessRequest, RequestService } from "./requestService";
import { APIGatewayProxyEvent } from "aws-lambda";

describe("Request Service", () => {
  let request: APIGatewayProxyEvent;
  let requestService: IProcessRequest;

  beforeEach(() => {
    requestService = new RequestService();
    request = buildRequest();
  });
  describe("Processing the request", () => {
    describe("Request body validation", () => {
      describe("Given there is no request body", () => {
        it('Returns Log with value "Invalid grant_type"', () => {
          request.body = null;

          const result = requestService.processRequest(request);

          expect(result.isLog).toEqual(true);
          expect(result.value).toEqual("Invalid grant_type");
        });
      });

      describe("Given request body is an empty object", () => {
        it("Returns Log with value Invalid grant_type", () => {
          request.body = JSON.stringify({});

          const result = requestService.processRequest(request);

          expect(result.isLog).toEqual(true);
          expect(result.value).toEqual("Invalid grant_type");
        });
      });

      describe("Given request body is does not include grant_type", () => {
        it("Returns Log with value Invalid grant_type", () => {
          request.body = JSON.stringify({ mockKey: "mockValue" });

          const result = requestService.processRequest(request);

          expect(result.isLog).toEqual(true);
          expect(result.value).toEqual("Invalid grant_type");
        });
      });

      describe("Given grant_type is not client_credentials", () => {
        it("Returns Log with value Invalid grant_type", () => {
          request.body = JSON.stringify({ grant_type: "mockInvalidGrantType" });

          const result = requestService.processRequest(request);

          expect(result.isLog).toEqual(true);
          expect(result.value).toEqual("Invalid grant_type");
        });
      });
    });

    describe("Request Authorization header validation", () => {
      describe("Given request does not include authorization header", () => {
        it('Returns Log with value "Invalid Request"', () => {
          request.body = JSON.stringify({ grant_type: "client_credentials" });

          const result = requestService.processRequest(request);

          expect(result.isLog).toEqual(true);
          expect(result.value).toEqual("Invalid authorization header");
        });
      });

      describe("Given authorization header does not use Basic Authentication Scheme", () => {
        it('Returns Log with value "Invalid Request"', () => {
          request.body = JSON.stringify({ grant_type: "client_credentials" });
          request.headers = { authorization: "mockAuthorization" };

          const result = requestService.processRequest(request);

          expect(result.isLog).toEqual(true);
          expect(result.value).toEqual("Invalid authorization header");
        });
      });
    });

    describe("Decoding Authorization header", () => {
      describe("Given Authorization header is not formatted correctly", () => {
        it("Logs with invalid Authorization header format", () => {
          request.body = JSON.stringify({ grant_type: "client_credentials" });
          const authorizationHeader = "Basic bW9ja0NsaWVuZElk="; // base64encoded mockCliendId, should be formatted <clientIdValue>:<clientSecretValue>
          request.headers = { Authorization: authorizationHeader };

          const result = requestService.processRequest(request);

          expect(result.isLog).toEqual(true);
          expect(result.value).toEqual("Client secret incorrectly formatted");
        });
      });
    });

    describe("Given the request is valid", () => {
      it("Returns Value with value of base64 decoded supplied credentials", () => {
        request.body = JSON.stringify({ grant_type: "client_credentials" });
        const authorizationHeader =
          "Basic bW9ja0NsaWVudElkOm1vY2tDbGllbnRTZWNyZXQ="; // base64encoded mockClientId:mockClientSecret
        request.headers = { Authorization: authorizationHeader };

        const result = requestService.processRequest(request);

        expect(result.isLog).toEqual(false);
        expect(result.value).toEqual({
          clientId: "mockClientId",
          clientSecret: "mockClientSecret",
        });
      });
    });
  });
});

function buildRequest(overrides?: {
  [key in string]: string;
}): APIGatewayProxyEvent {
  const defaultRequest = {
    httpMethod: "get",
    body: "",
    headers: {
      "x-correlation-id": "correlationId",
    },
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: {},
    path: "/hello",
    pathParameters: {},
    queryStringParameters: {},
    requestContext: {
      accountId: "123456789012",
      apiId: "1234",
      authorizer: {},
      httpMethod: "get",
      identity: { sourceIp: "1.1.1.1" },
      path: "/hello",
      protocol: "HTTP/1.1",
      requestId: "c6af9ac6-7b61-11e6-9a41-93e8deadbeef",
      requestTimeEpoch: 1428582896000,
      resourceId: "123456",
      resourcePath: "/hello",
      stage: "dev",
    },
    resource: "",
    stageVariables: {},
  };
  return { ...defaultRequest, ...overrides };
}
