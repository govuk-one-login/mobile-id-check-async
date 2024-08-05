import {
  IAsyncTokenRequestDependencies,
  lambdaHandlerConstructor,
} from "./asyncTokenHandler";
import { buildRequest } from "../testUtils/mockRequest";
import { MessageName, registeredLogs } from "./registeredLogs";
import { Logger } from "../services/logging/logger";
import { APIGatewayProxyEvent } from "aws-lambda";
import { buildLambdaContext } from "../testUtils/mockContext";
import { MockLoggingAdapter } from "../services/logging/tests/mockLogger";
import {
  MockEventServiceFailToWrite,
  MockEventWriterSuccess,
} from "../services/events/tests/mocks";
import { MockRequestServiceSuccessResult, MockClientRegistryServiceSuccessResult, MockTokenServiceSuccessResult, MockRequestServiceInvalidGrantTypeErrorResult, MockRequestServiceInvalidAuthorizationHeaderErrorResult, MockClientRegistryServiceInternalServerErrorResult, MockClientRegistryServiceBadRequestResult, MockTokenServiceErrorResult } from "../testUtils/asyncTokenMocks";

describe("Async Token", () => {
  let mockLogger: MockLoggingAdapter<MessageName>;
  let request: APIGatewayProxyEvent;
  let dependencies: IAsyncTokenRequestDependencies;

  const env = {
    SIGNING_KEY_ID: "mockSigningKeyId",
    ISSUER: "mockIssuer",
    SQS_QUEUE: "mockSQSQueue",
    CLIENT_REGISTRY_PARAMETER_NAME: "mockParmaterName",
  };

  beforeEach(() => {
    request = buildRequest();
    mockLogger = new MockLoggingAdapter();
    dependencies = {
      env,
      eventService: () => new MockEventWriterSuccess(),
      logger: () => new Logger(mockLogger, registeredLogs),
      requestService: () => new MockRequestServiceSuccessResult(),
      clientRegistryService: () => new MockClientRegistryServiceSuccessResult(),
      tokenService: () => new MockTokenServiceSuccessResult(),
    };
  });

  describe("Environment variable validation", () => {
    describe.each(Object.keys(env))("Given %s is missing", (envVar: string) => {
      it("Returns a 500 Server Error response", async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        delete dependencies.env[envVar];
        const result = await lambdaHandlerConstructor(
          dependencies,
          buildLambdaContext(),
          request,
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
    describe("Given the Request Service returns a log due to Invalid grant_type in request body", () => {
      it("Returns a 400 Bad Request response", async () => {
        dependencies.requestService = () =>
          new MockRequestServiceInvalidGrantTypeErrorResult();

        const result = await lambdaHandlerConstructor(
          dependencies,
          buildLambdaContext(),
          request,
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

    describe("Given the Request Service returns a log due to invalid Authorization header ", () => {
      it("Returns a 400 Bad Request response", async () => {
        dependencies.requestService = () =>
          new MockRequestServiceInvalidAuthorizationHeaderErrorResult();

        const result = await lambdaHandlerConstructor(
          dependencies,
          buildLambdaContext(),
          request,
        );

        expect(mockLogger.getLogMessages()[1].logMessage).toMatchObject({
          message: "INVALID_REQUEST",
          messageCode: "MOBILE_ASYNC_INVALID_REQUEST",
        });
        expect(mockLogger.getLogMessages()[1].data).toMatchObject({
          errorMessage: "Invalid authorization header",
        });

        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body).error).toEqual(
          "invalid_authorization_header",
        );
        expect(JSON.parse(result.body).error_description).toEqual(
          "Invalid authorization header",
        );
      });
    });
  });

  describe("Client Credentials Service", () => {
    describe("Get issuer from client registry", () => {
      describe("Given there is an unexpected error retrieving the client credentials", () => {
        it("Returns a 500 Server Error response", async () => {
          dependencies.clientRegistryService = () =>
            new MockClientRegistryServiceInternalServerErrorResult();

          const result = await lambdaHandlerConstructor(
            dependencies,
            buildLambdaContext(),
            request,
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
            buildLambdaContext(),
            request,
          );

          expect(mockLogger.getLogMessages()[1].logMessage).toMatchObject({
            message: "INVALID_REQUEST",
            messageCode: "MOBILE_ASYNC_INVALID_REQUEST",
          });
          expect(mockLogger.getLogMessages()[1].data).toMatchObject({
            errorMessage: "Client secrets invalid",
          });

          expect(result.statusCode).toBe(400);
          expect(JSON.parse(result.body).error).toEqual("invalid_client");
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
          buildLambdaContext(),
          request,
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
            buildLambdaContext(),
            request,
          );

          expect(mockLogger.getLogMessages()[1].logMessage).toMatchObject({
            message: "ERROR_WRITING_AUDIT_EVENT",
            messageCode: "MOBILE_ASYNC_ERROR_WRITING_AUDIT_EVENT",
          });
          expect(mockLogger.getLogMessages()[1].data).toMatchObject({
            errorMessage: "Error writing to SQS",
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
            buildLambdaContext(),
            request,
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
