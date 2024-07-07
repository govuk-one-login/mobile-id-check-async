import { buildRequest } from "../../testUtils/mockRequest";
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

          expect(result.isError).toEqual(true);
          expect(result.value).toEqual("Invalid grant_type");
        });
      });

      describe("Given request body is an empty object", () => {
        it("Returns Log with value Invalid grant_type", () => {
          request.body = JSON.stringify({});

          const result = requestService.processRequest(request);

          expect(result.isError).toEqual(true);
          expect(result.value).toEqual("Invalid grant_type");
        });
      });

      describe("Given request body is does not include grant_type", () => {
        it("Returns Log with value Invalid grant_type", () => {
          request.body = JSON.stringify({ mockKey: "mockValue" });

          const result = requestService.processRequest(request);

          expect(result.isError).toEqual(true);
          expect(result.value).toEqual("Invalid grant_type");
        });
      });

      describe("Given grant_type is not client_credentials", () => {
        it("Returns Log with value Invalid grant_type", () => {
          request.body = JSON.stringify({ grant_type: "mockInvalidGrantType" });

          const result = requestService.processRequest(request);

          expect(result.isError).toEqual(true);
          expect(result.value).toEqual("Invalid grant_type");
        });
      });
    });

    describe("Request Authorization header validation", () => {
      describe("Given request does not include authorization header", () => {
        it('Returns Log with value "Invalid Request"', () => {
          request.body = JSON.stringify({ grant_type: "client_credentials" });

          const result = requestService.processRequest(request);

          expect(result.isError).toEqual(true);
          expect(result.value).toEqual("Invalid authorization header");
        });
      });

      describe("Given authorization header does not use Basic Authentication Scheme", () => {
        it('Returns Log with value "Invalid Request"', () => {
          request.body = JSON.stringify({ grant_type: "client_credentials" });
          request.headers = { authorization: "mockAuthorization" };

          const result = requestService.processRequest(request);

          expect(result.isError).toEqual(true);
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

          expect(result.isError).toEqual(true);
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

        expect(result.isError).toEqual(false);
        expect(result.value).toEqual({
          clientId: "mockClientId",
          clientSecret: "mockClientSecret",
        });
      });
    });
  });
});
