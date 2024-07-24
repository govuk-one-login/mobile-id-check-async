import {
  IAsyncTokenRequestDependencies,
  lambdaHandlerConstructor,
} from "./asyncTokenHandler";
import {
  IClientCredentials,
  IClientCredentialsService,
} from "../services/clientCredentialsService/clientCredentialsService";
import { IProcessRequest } from "./requestService/requestService";
import { IGetClientCredentials } from "./ssmService/ssmService";
// import { IJwtPayload, IMintToken } from "./tokenService/tokenService";
import { buildRequest } from "../testUtils/mockRequest";
import { IDecodedClientCredentials } from "../types/clientCredentials";
import { IMintToken } from "./tokenService/tokenService";

import { MessageName, registeredLogs } from "./registeredLogs";
import { Logger } from "../services/logging/logger";
import { APIGatewayProxyEvent } from "aws-lambda";
import {
  ErrorOrSuccess,
  errorResponse,
  successResponse,
} from "../types/errorOrValue";
import { buildLambdaContext } from "../testUtils/mockContext";
import { MockLoggingAdapter } from "../services/logging/tests/mockLogger";
import {
  MockEventServiceFailToWrite,
  MockEventWriterSuccess,
} from "../services/events/tests/mocks";

describe("Async Token", () => {
  let mockLogger: MockLoggingAdapter<MessageName>;
  let request: APIGatewayProxyEvent;
  let dependencies: IAsyncTokenRequestDependencies;

  const env = {
    SIGNING_KEY_ID: "mockSigningKeyId",
    ISSUER: "mockIssuer",
    SQS_QUEUE: "mockSQSQueue",
  };

  beforeEach(() => {
    request = buildRequest();
    mockLogger = new MockLoggingAdapter();
    dependencies = {
      env,
      eventService: () => new MockEventWriterSuccess(),
      logger: () => new Logger(mockLogger, registeredLogs),
      requestService: () => new MockRequestServiceValueResponse(),
      ssmService: () => new MockPassingSsmService(),
      clientCredentialService: () => new MockPassingClientCredentialsService(),
      tokenService: () => new MockPassingTokenService(),
    };
  });

  describe("Environment variable validation", () => {
    describe.each([Object.keys(env)])(
      "Given %s is missing",
      (envVar: string) => {
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
      },
    );
  });

  describe("Request Service", () => {
    describe("Given the Request Service returns a log due to Invalid grant_type in request body", () => {
      it("Returns a 400 Bad Request response", async () => {
        dependencies.requestService = () =>
          new MockRequestServiceInvalidGrantTypeLogResponse();

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
          new MockRequestServiceInvalidAuthorizationHeaderLogResponse();

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

  describe("SSM Service", () => {
    describe("Given there is an error retrieving client credentials from SSM", () => {
      it("Returns a 500 Server Error response", async () => {
        dependencies.ssmService = () => new MockFailingSsmService();

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
          errorMessage: "Error from SSM Service",
        });

        expect(JSON.parse(result.body).error).toEqual("server_error");
        expect(JSON.parse(result.body).error_description).toEqual(
          "Server Error",
        );
      });
    });
  });

  describe("Client Credentials Service", () => {
    describe("Get client credentials by ID", () => {
      describe("Given credentials are not found", () => {
        it("Returns 400 Bad Request response", async () => {
          dependencies.clientCredentialService = () =>
            new MockFailingClientCredentialsServiceGetClientCredentialsById();

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
            errorMessage: "Client credentials not registered",
          });

          expect(result.statusCode).toBe(400);
          expect(JSON.parse(result.body).error).toEqual("invalid_client");
          expect(JSON.parse(result.body).error_description).toEqual(
            "Supplied client credentials not recognised",
          );
        });
      });
    });

    describe("Credential validation", () => {
      describe("Given credentials are not valid", () => {
        it("Returns 400 Bad request response", async () => {
          dependencies.clientCredentialService = () =>
            new MockFailingClientCredentialsServiceValidation();

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
            errorMessage: "Client secrets not valid",
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
        dependencies.tokenService = () => new MockFailingTokenService();

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

class MockRequestServiceValueResponse implements IProcessRequest {
  processRequest = (): ErrorOrSuccess<IDecodedClientCredentials> => {
    return successResponse({
      clientId: "mockClientId",
      clientSecret: "mockClientSecret",
    });
  };
}

class MockRequestServiceInvalidGrantTypeLogResponse implements IProcessRequest {
  processRequest = (): ErrorOrSuccess<IDecodedClientCredentials> => {
    return errorResponse("Invalid grant_type");
  };
}

class MockRequestServiceInvalidAuthorizationHeaderLogResponse
  implements IProcessRequest
{
  processRequest = (): ErrorOrSuccess<IDecodedClientCredentials> => {
    return errorResponse("Invalid authorization header");
  };
}

class MockPassingSsmService implements IGetClientCredentials {
  getClientCredentials = async (
    clientCredentials: IClientCredentials[] = [
      {
        client_id: "mockClientId",
        issuer: "mockIssuer",
        salt: "mockSalt",
        hashed_client_secret: "mockHashedClientSecret",
      },
    ],
  ): Promise<ErrorOrSuccess<IClientCredentials[]>> => {
    return Promise.resolve(successResponse(clientCredentials));
  };
}

class MockFailingSsmService implements IGetClientCredentials {
  getClientCredentials = async (): Promise<
    ErrorOrSuccess<IClientCredentials[]>
  > => {
    return errorResponse("Error from SSM Service");
  };
}

class MockPassingClientCredentialsService implements IClientCredentialsService {
  validateTokenRequest(): ErrorOrSuccess<null> {
    return successResponse(null);
  }
  validateRedirectUri(): ErrorOrSuccess<null> {
    return successResponse(null);
  }
  getClientCredentialsById(): ErrorOrSuccess<IClientCredentials> {
    return successResponse({
      client_id: "mockClientId",
      issuer: "mockIssuer",
      salt: "mockSalt",
      hashed_client_secret: "mockHashedClientSecret",
    });
  }
}

class MockFailingClientCredentialsServiceGetClientCredentialsById
  implements IClientCredentialsService
{
  validateTokenRequest(): ErrorOrSuccess<null> {
    return successResponse(null);
  }
  validateRedirectUri(): ErrorOrSuccess<null> {
    return successResponse(null);
  }
  getClientCredentialsById(): ErrorOrSuccess<IClientCredentials> {
    return errorResponse("Client credentials not recognised");
  }
}

class MockFailingClientCredentialsServiceValidation
  implements IClientCredentialsService
{
  validateTokenRequest(): ErrorOrSuccess<null> {
    return errorResponse("Client secrets not valid");
  }
  validateRedirectUri(): ErrorOrSuccess<null> {
    return successResponse(null);
  }
  getClientCredentialsById() {
    return successResponse({
      client_id: "mockClientId",
      issuer: "mockIssuer",
      salt: "mockSalt",
      hashed_client_secret: "mockHashedClientSecret",
    });
  }
}

class MockPassingTokenService implements IMintToken {
  async mintToken(): Promise<ErrorOrSuccess<string>> {
    return successResponse("mockToken");
  }
}

class MockFailingTokenService implements IMintToken {
  async mintToken(): Promise<ErrorOrSuccess<string>> {
    return errorResponse("Failed to sign Jwt");
  }
}
