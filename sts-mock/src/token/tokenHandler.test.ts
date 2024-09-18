import { Logger } from "../services/logging/logger";
import { MockLoggingAdapter } from "../services/logging/tests/mockLoggingAdapter";
import { buildLambdaContext } from "../testUtils/mockContext";
import { MessageName, registeredLogs } from "./registeredLogs";
import { lambdaHandlerConstructor } from "./tokenHandler";
import { APIGatewayProxyEvent } from "aws-lambda";
import { ITokenDependencies } from "./handlerDependencies";
import { buildTokenRequest } from "../testUtils/mockRequest";
import { validateServiceTokenRequest } from "./validateServiceTokenRequest";
import {
  MockServiceTokenGeneratorErrorResult,
  MockServiceTokenGeneratorSuccessResult,
} from "./serviceTokenGenerator/tests/mocks";

describe("Token", () => {
  let mockLogger: MockLoggingAdapter<MessageName>;
  let event: APIGatewayProxyEvent;
  let dependencies: ITokenDependencies;

  const env = {
    MOCK_STS_BASE_URL: "mockStsBaseUrl",
    KEY_STORAGE_BUCKET_NAME: "mockKeyStorageBucketName",
  };

  beforeEach(() => {
    event = buildTokenRequest(
      "subject_token=testSub&scope=mock_service_name.mock_apiName.mock_accessLevel",
    );

    mockLogger = new MockLoggingAdapter();
    dependencies = {
      env,
      logger: () => new Logger(mockLogger, registeredLogs),
      validateServiceTokenRequestBody: validateServiceTokenRequest,
      serviceTokenGenerator: () => new MockServiceTokenGeneratorSuccessResult(),
    };
  });

  describe("Environment variable validation", () => {
    describe.each(Object.keys(env))("Given %s is missing", (envVar: string) => {
      it("Logs ENVIRONMENT_VARIABLE_MISSING and returns 500 Server Error", async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        delete dependencies.env[envVar];

        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages()[1].logMessage.message).toBe(
          "ENVIRONMENT_VARIABLE_MISSING",
        );
        expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
          errorMessage: `No ${envVar}`,
        });
        expect(result.statusCode).toStrictEqual(500);
        expect(result.body).toStrictEqual(
          '{"error":"server_error","error_description":"Server Error"}',
        );
      });
    });
  });

  describe("Validate Service Token Request", () => {
    describe("Given the request body is undefined", () => {
      it("Returns 400 Bad Request and 'Missing request body'", async () => {
        event = buildTokenRequest(undefined);

        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
          "STARTED",
        );
        expect(mockLogger.getLogMessages()[1].logMessage.message).toBe(
          "INVALID_REQUEST",
        );
        expect(result.statusCode).toStrictEqual(400);
        expect(result.body).toStrictEqual(
          '{"error":"invalid_request","error_description":"Missing request body"}',
        );
      });
    });

    describe("Given the request body is missing the key 'subject_token'", () => {
      it("Returns 400 Bad Request and 'Missing subject_token'", async () => {
        event = buildTokenRequest(
          "scope=mock_service_name.mock_apiName.mock_accessLevel",
        );

        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
          "STARTED",
        );
        expect(mockLogger.getLogMessages()[1].logMessage.message).toBe(
          "INVALID_REQUEST",
        );
        expect(result.statusCode).toStrictEqual(400);
        expect(result.body).toStrictEqual(
          '{"error":"invalid_request","error_description":"Missing subject_token"}',
        );
      });
    });

    describe("Given the request body is missing the key 'scope'", () => {
      it("Returns 400 Bad Request and 'Missing scope'", async () => {
        event = buildTokenRequest("subject_token=testSub");

        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
          "STARTED",
        );
        expect(mockLogger.getLogMessages()[1].logMessage.message).toBe(
          "INVALID_REQUEST",
        );
        expect(result.statusCode).toStrictEqual(400);
        expect(result.body).toStrictEqual(
          '{"error":"invalid_request","error_description":"Missing scope"}',
        );
      });
    });
  });

  describe("Service Token Generator", () => {
    describe("Given an error happens trying to generate the service token", () => {
      it("Returns 500 Server Error", async () => {
        dependencies.serviceTokenGenerator = () =>
          new MockServiceTokenGeneratorErrorResult();

        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
          "STARTED",
        );
        expect(mockLogger.getLogMessages()[1].logMessage.message).toBe(
          "INTERNAL_SERVER_ERROR",
        );
        expect(result.statusCode).toStrictEqual(500);
        expect(result.body).toStrictEqual(
          '{"error":"server_error","error_description":"Server Error"}',
        );
      });
    });
  });

  describe("Issue service token", () => {
    describe("Given the request is valid and the service token is generated", () => {
      it("Returns 200 and the service token", async () => {
        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
          "STARTED",
        );
        expect(mockLogger.getLogMessages()[1].logMessage.message).toBe(
          "COMPLETED",
        );
        expect(result).toStrictEqual({
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
            Pragma: "no-cache",
          },
          statusCode: 200,
          body: JSON.stringify({
            access_token: "mockServiceToken",
            token_type: "Bearer",
            expires_in: 180,
          }),
        });
      });
    });
  });
});
