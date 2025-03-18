import { expect } from "@jest/globals";
import "../../../tests/testUtils/matchers";
import { APIGatewayProxyEvent, Context } from "aws-lambda";
import {
  MockEventServiceFailToWrite,
  MockEventWriterSuccess,
} from "../services/events/tests/mocks";
import { buildLambdaContext } from "../testUtils/mockContext";
import {
  buildRequest,
  buildTokenHandlerRequest,
} from "../testUtils/mockRequest";
import { lambdaHandlerConstructor } from "./asyncTokenHandler";
import { IAsyncTokenRequestDependencies } from "./handlerDependencies";
import {
  MockClientRegistryServiceSuccessResult,
  MockClientRegistryServiceInternalServerErrorResult,
  MockClientRegistryServiceBadRequestResult,
} from "../services/clientRegistryService/tests/mocks";
import {
  MockTokenServiceSuccessResult,
  MockTokenServiceErrorResult,
} from "./tokenService/tests/mocks";
import { RequestService } from "./requestService/requestService";
import { logger } from "../common/logging/logger";
import { createHash } from "node:crypto";

describe("Async Token", () => {
  let request: APIGatewayProxyEvent;
  let dependencies: IAsyncTokenRequestDependencies;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let context: Context;

  const env = {
    SIGNING_KEY_ID: "mockSigningKeyId",
    ISSUER: "mockIssuer",
    TXMA_SQS: "mockSQSQueue",
    CLIENT_REGISTRY_SECRET_NAME: "mockParmaterName",
  };

  const validAuthorizationHeader =
    "Basic bW9ja0NsaWVudElkOm1vY2tDbGllbnRTZWNyZXQ="; // Header decodes to base64encoded mockClientId:mockClientSecret

  beforeEach(() => {
    consoleInfoSpy = jest.spyOn(console, "info");
    consoleErrorSpy = jest.spyOn(console, "error");
    context = buildLambdaContext();
    // Header decodes to base64encoded mockClientId:mockClientSecret
    request = buildTokenHandlerRequest({
      body: "grant_type=client_credentials",
      authorizationHeader: validAuthorizationHeader,
    });
    dependencies = {
      env,
      eventService: () => new MockEventWriterSuccess(),
      clientRegistryService: () => new MockClientRegistryServiceSuccessResult(),
      tokenService: () => new MockTokenServiceSuccessResult(),
      requestService: () => new RequestService(),
    };
  });

  describe("Adds context and version to log attributes and logs STARTED message", () => {
    beforeEach(async () => {
      logger.appendKeys({ testKey: "testValue" });
      const event = buildRequest();
      await lambdaHandlerConstructor(dependencies, event, context);
    });

    it("Adds context and version to log attributes and logs STARTED message", () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_TOKEN_STARTED",
        functionVersion: "1",
        function_arn: "arn:12345", // example field to verify that context has been added
      });
    });

    it("Clears pre-existing log attributes", async () => {
      expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
        testKey: "testValue",
      });
    });
  });

  describe("Environment variable validation", () => {
    describe.each(Object.keys(env))("Given %s is missing", (envVar: string) => {
      it("Returns a 500 Server Error response", async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        delete dependencies.env[envVar];
        const result = await lambdaHandlerConstructor(
          dependencies,
          request,
          buildLambdaContext(),
        );

        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_TOKEN_INVALID_CONFIG",
          errorMessage: `No ${envVar}`,
        });

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 500,
          body: JSON.stringify({
            error: "server_error",
            error_description: "Server Error",
          }),
        });
      });
    });
  });

  describe("Request Service", () => {
    describe("Request body validation", () => {
      describe("Given there is no request body", () => {
        it("Returns a log and 400 response", async () => {
          const result = await lambdaHandlerConstructor(
            dependencies,
            buildTokenHandlerRequest({
              body: null,
              authorizationHeader: validAuthorizationHeader,
            }),
            buildLambdaContext(),
          );

          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_TOKEN_REQUEST_BODY_INVALID",
            errorMessage: "Missing request body",
          });

          expect(result.statusCode).toBe(400);
          expect(JSON.parse(result.body).error).toEqual("invalid_grant");
          expect(JSON.parse(result.body).error_description).toEqual(
            "Invalid grant type or grant type not specified",
          );
        });
      });

      describe("Given there is no grant_type", () => {
        it("Returns log and 400 response", async () => {
          const result = await lambdaHandlerConstructor(
            dependencies,
            buildTokenHandlerRequest({
              body: JSON.stringify({}),
              authorizationHeader: validAuthorizationHeader,
            }),
            buildLambdaContext(),
          );

          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_TOKEN_REQUEST_BODY_INVALID",
            errorMessage: "Missing grant_type",
          });

          expect(result.statusCode).toBe(400);
          expect(JSON.parse(result.body).error).toEqual("invalid_grant");
          expect(JSON.parse(result.body).error_description).toEqual(
            "Invalid grant type or grant type not specified",
          );
        });
      });

      describe("Given grant_type is not client_credentials", () => {
        it("Returns Log with value Invalid grant_type", async () => {
          const result = await lambdaHandlerConstructor(
            dependencies,

            buildTokenHandlerRequest({
              body: "grant_type=invalidGrantType",
              authorizationHeader: validAuthorizationHeader,
            }),
            buildLambdaContext(),
          );

          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_TOKEN_REQUEST_BODY_INVALID",
            errorMessage: "Invalid grant_type",
          });

          expect(result.statusCode).toBe(400);
          expect(JSON.parse(result.body).error).toEqual("invalid_grant");
          expect(JSON.parse(result.body).error_description).toEqual(
            "Invalid grant type or grant type not specified",
          );
        });
      });
    });

    describe("Authorization header validation", () => {
      describe("Given authorization header is not present", () => {
        it('Returns Log with value "Invalid Request"', async () => {
          const result = await lambdaHandlerConstructor(
            dependencies,
            buildRequest({
              body: "grant_type=client_credentials",
            }),
            buildLambdaContext(),
          );

          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_TOKEN_REQUEST_HEADERS_INVALID",
            errorMessage: "Missing authorization header",
          });

          expect(result.statusCode).toBe(401);
          expect(JSON.parse(result.body).error).toEqual("invalid_client");
          expect(JSON.parse(result.body).error_description).toEqual(
            "Invalid or missing authorization header",
          );
        });
      });

      describe("Given authorization header is null", () => {
        it('Returns Log with value "Invalid Request"', async () => {
          const result = await lambdaHandlerConstructor(
            dependencies,
            buildTokenHandlerRequest({
              body: "grant_type=client_credentials",
              authorizationHeader: null,
            }),
            buildLambdaContext(),
          );

          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_TOKEN_REQUEST_HEADERS_INVALID",
            errorMessage: "Missing authorization header",
          });

          expect(result.statusCode).toBe(401);
          expect(JSON.parse(result.body).error).toEqual("invalid_client");
          expect(JSON.parse(result.body).error_description).toEqual(
            "Invalid or missing authorization header",
          );
        });
      });

      describe("Given authorization header is an empty string", () => {
        it('Returns Log with value "Invalid Request"', async () => {
          const result = await lambdaHandlerConstructor(
            dependencies,
            buildTokenHandlerRequest({
              body: "grant_type=client_credentials",
              authorizationHeader: "",
            }),
            buildLambdaContext(),
          );

          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_TOKEN_REQUEST_HEADERS_INVALID",
            errorMessage: "Missing authorization header",
          });

          expect(result.statusCode).toBe(401);
          expect(JSON.parse(result.body).error).toEqual("invalid_client");
          expect(JSON.parse(result.body).error_description).toEqual(
            "Invalid or missing authorization header",
          );
        });
      });

      describe("Given authorization header does not use Basic Authentication Scheme", () => {
        it('Returns Log with value "Invalid Request"', async () => {
          const result = await lambdaHandlerConstructor(
            dependencies,

            buildTokenHandlerRequest({
              body: "grant_type=client_credentials",
              authorizationHeader: "missingBearerKeyword",
            }),
            buildLambdaContext(),
          );

          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_TOKEN_REQUEST_HEADERS_INVALID",
            errorMessage: "Invalid authorization header",
          });

          expect(result.statusCode).toBe(401);
          expect(JSON.parse(result.body).error).toEqual("invalid_client");
          expect(JSON.parse(result.body).error_description).toEqual(
            "Invalid or missing authorization header",
          );
        });
      });
    });

    describe("Decoding Authorization header", () => {
      describe("Given Authorization header is not formatted correctly", () => {
        it("Logs with invalid Authorization header format", async () => {
          const result = await lambdaHandlerConstructor(
            dependencies,
            buildTokenHandlerRequest({
              body: "grant_type=client_credentials",
              authorizationHeader: "Basic bW9ja0NsaWVuZElk", // decodes to Basic mockCliendId
            }),
            buildLambdaContext(),
          );

          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_TOKEN_REQUEST_HEADERS_INVALID",
            errorMessage: "Client secret incorrectly formatted",
          });

          expect(result.statusCode).toBe(401);
          expect(JSON.parse(result.body).error).toEqual("invalid_client");
          expect(JSON.parse(result.body).error_description).toEqual(
            "Invalid or missing authorization header",
          );
        });
      });
    });
  });

  describe("Client Registry Service", () => {
    describe("Get issuer from client registry", () => {
      describe("Given there is an unexpected error retrieving the client registry", () => {
        it("Returns a 500 Server Error response", async () => {
          dependencies.clientRegistryService = () =>
            new MockClientRegistryServiceInternalServerErrorResult();

          const result = await lambdaHandlerConstructor(
            dependencies,

            request,
            buildLambdaContext(),
          );

          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_GET_CLIENT_REGISTRY_FAILURE",
            errorMessage: "Unexpected error retrieving issuer",
          });

          expect(JSON.parse(result.body).error).toEqual("server_error");
          expect(JSON.parse(result.body).error_description).toEqual(
            "Server Error",
          );
        });
      });

      describe("Given the credentials are not valid", () => {
        it("Returns 400 Bad Request response", async () => {
          dependencies.clientRegistryService = () =>
            new MockClientRegistryServiceBadRequestResult();

          const result = await lambdaHandlerConstructor(
            dependencies,

            request,
            buildLambdaContext(),
          );

          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_CLIENT_NOT_FOUND_IN_REGISTRY",
            errorMessage: "Client secrets invalid",
          });

          expect(result.statusCode).toBe(400);
          expect(JSON.parse(result.body).error).toEqual("invalid_grant");
          expect(JSON.parse(result.body).error_description).toEqual(
            "Supplied client credentials not recognised",
          );
        });
      });
    });
  });

  describe("Token Service", () => {
    describe("Given minting a new token fails", () => {
      it("Returns 500 Server Error response", async () => {
        dependencies.tokenService = () => new MockTokenServiceErrorResult();

        const result = await lambdaHandlerConstructor(
          dependencies,

          request,
          buildLambdaContext(),
        );

        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_TOKEN_FAILED_TO_MINT_TOKEN",
          errorMessage: "Failed to sign Jwt",
        });

        expect(result.statusCode).toBe(500);
        expect(JSON.parse(result.body).error).toEqual("server_error");
        expect(JSON.parse(result.body).error_description).toEqual(
          "Server Error",
        );
      });
    });
  });

  describe("Issue access token", () => {
    describe("Given the request is valid", () => {
      describe("Given there is an error writing the audit event", () => {
        it("Logs and returns a 500 server error", async () => {
          const mockFailingEventService = new MockEventServiceFailToWrite(
            "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
          );
          dependencies.eventService = () => mockFailingEventService;

          const result = await lambdaHandlerConstructor(
            dependencies,
            request,
            buildLambdaContext(),
          );

          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_ERROR_WRITING_AUDIT_EVENT",
            errorMessage:
              "Unexpected error writing the DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED event",
          });

          expect(result.statusCode).toBe(500);
          expect(JSON.parse(result.body).error).toEqual("server_error");
          expect(JSON.parse(result.body).error_description).toEqual(
            "Server Error",
          );
        });
      });

      describe("Given the event is written successfully", () => {
        it("Logs and returns with 200 response with an access token in the response body", async () => {
          const mockEventWriter = new MockEventWriterSuccess();
          dependencies.eventService = () => mockEventWriter;
          const result = await lambdaHandlerConstructor(
            dependencies,
            request,
            buildLambdaContext(),
          );

          console.log(hashSecret())

          expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_TOKEN_COMPLETED",
          });

          expect(mockEventWriter.auditEvents[0]).toBe(
            "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
          );

          expect(result.statusCode);
          expect(result.body).toEqual(
            JSON.stringify({
              access_token: "mockToken",
              token_type: "Bearer",
              expires_in: 3600,
            }),
          );
        });
      });
    });
  });
});

const hashSecret = (secret: string, salt: string): string => {
  return createHash("sha256")
    .update(secret + salt)
    .digest("hex");
};