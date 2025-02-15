import { APIGatewayProxyEvent } from "aws-lambda";
import {
  MockEventServiceFailToWrite,
  MockEventWriterSuccess,
} from "../services/events/tests/mocks";
import { Logger } from "../services/logging/logger";
import { MockLoggingAdapter } from "../services/logging/tests/mockLogger";
import { buildLambdaContext } from "../testUtils/mockContext";
import {
  buildRequest,
  buildTokenHandlerRequest,
} from "../testUtils/mockRequest";
import { lambdaHandlerConstructor } from "./asyncTokenHandler";
import { MessageName, registeredLogs } from "./registeredLogs";
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

describe("Async Token", () => {
  let mockLogger: MockLoggingAdapter<MessageName>;
  let request: APIGatewayProxyEvent;
  let dependencies: IAsyncTokenRequestDependencies;

  const env = {
    SIGNING_KEY_ID: "mockSigningKeyId",
    ISSUER: "mockIssuer",
    TXMA_SQS: "mockSQSQueue",
    CLIENT_REGISTRY_SECRET_NAME: "mockParmaterName",
  };

  const validAuthorizationHeader =
    "Basic bW9ja0NsaWVudElkOm1vY2tDbGllbnRTZWNyZXQ="; // Header decodes to base64encoded mockClientId:mockClientSecret

  beforeEach(() => {
    // Header decodes to base64encoded mockClientId:mockClientSecret
    request = buildTokenHandlerRequest({
      body: "grant_type=client_credentials",
      authorizationHeader: validAuthorizationHeader,
    });
    mockLogger = new MockLoggingAdapter();
    dependencies = {
      env,
      eventService: () => new MockEventWriterSuccess(),
      logger: () => new Logger(mockLogger, registeredLogs),
      clientRegistryService: () => new MockClientRegistryServiceSuccessResult(),
      tokenService: () => new MockTokenServiceSuccessResult(),
      requestService: () => new RequestService(),
    };
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

        expect(mockLogger.getLogMessages()[1].logMessage.message).toBe(
          "ENVIRONMENT_VARIABLE_MISSING",
        );
        expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
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

          expect(mockLogger.getLogMessages()[1].logMessage).toMatchObject({
            message: "INVALID_REQUEST",
            messageCode: "MOBILE_ASYNC_INVALID_REQUEST",
          });

          expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
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

          expect(mockLogger.getLogMessages()[1].logMessage).toMatchObject({
            message: "INVALID_REQUEST",
            messageCode: "MOBILE_ASYNC_INVALID_REQUEST",
          });

          expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
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

          expect(mockLogger.getLogMessages()[1].logMessage).toMatchObject({
            message: "INVALID_REQUEST",
            messageCode: "MOBILE_ASYNC_INVALID_REQUEST",
          });

          expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
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

          expect(mockLogger.getLogMessages()[1].logMessage).toMatchObject({
            message: "INVALID_REQUEST",
            messageCode: "MOBILE_ASYNC_INVALID_REQUEST",
          });

          expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
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

          expect(mockLogger.getLogMessages()[1].logMessage).toMatchObject({
            message: "INVALID_REQUEST",
            messageCode: "MOBILE_ASYNC_INVALID_REQUEST",
          });

          expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
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

          expect(mockLogger.getLogMessages()[1].logMessage).toMatchObject({
            message: "INVALID_REQUEST",
            messageCode: "MOBILE_ASYNC_INVALID_REQUEST",
          });

          expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
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

          expect(mockLogger.getLogMessages()[1].logMessage).toMatchObject({
            message: "INVALID_REQUEST",
            messageCode: "MOBILE_ASYNC_INVALID_REQUEST",
          });

          expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
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

          expect(mockLogger.getLogMessages()[1].logMessage).toMatchObject({
            message: "INVALID_REQUEST",
            messageCode: "MOBILE_ASYNC_INVALID_REQUEST",
          });

          expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
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

          expect(mockLogger.getLogMessages()[1].logMessage).toMatchObject({
            message: "INTERNAL_SERVER_ERROR",
            messageCode: "MOBILE_ASYNC_INTERNAL_SERVER_ERROR",
          });
          expect(mockLogger.getLogMessages()[1].data).toMatchObject({
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

          expect(mockLogger.getLogMessages()[1].logMessage).toMatchObject({
            message: "INVALID_REQUEST",
            messageCode: "MOBILE_ASYNC_INVALID_REQUEST",
          });
          expect(mockLogger.getLogMessages()[1].data).toMatchObject({
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

        expect(mockLogger.getLogMessages()[1].logMessage).toMatchObject({
          message: "INTERNAL_SERVER_ERROR",
          messageCode: "MOBILE_ASYNC_INTERNAL_SERVER_ERROR",
        });
        expect(mockLogger.getLogMessages()[1].data).toMatchObject({
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

          expect(mockLogger.getLogMessages()[1].logMessage).toMatchObject({
            message: "ERROR_WRITING_AUDIT_EVENT",
            messageCode: "MOBILE_ASYNC_ERROR_WRITING_AUDIT_EVENT",
          });
          expect(mockLogger.getLogMessages()[1].data).toMatchObject({
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
          expect(mockLogger.getLogMessages()[0].logMessage).toMatchObject({
            message: "STARTED",
            messageCode: "MOBILE_ASYNC_STARTED",
            awsRequestId: "awsRequestId",
            functionName: "lambdaFunctionName",
          });

          expect(mockLogger.getLogMessages()[1].logMessage).toMatchObject({
            message: "COMPLETED",
            messageCode: "MOBILE_ASYNC_COMPLETED",
            awsRequestId: "awsRequestId",
            functionName: "lambdaFunctionName",
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
