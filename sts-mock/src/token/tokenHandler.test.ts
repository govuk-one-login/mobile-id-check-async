import { Logger } from "../services/logging/logger";
import { MockLoggingAdapter } from "../services/logging/tests/mockLoggingAdapter";
import { buildLambdaContext } from "../testUtils/mockContext";
import { MessageName, registeredLogs } from "./registeredLogs";
import { lambdaHandlerConstructor } from "./tokenHandler";
import { APIGatewayProxyEvent } from "aws-lambda";
import { ITokenDependencies } from "./handlerDependencies";
import { buildTokenRequest } from "../testUtils/mockRequest";
import { validateServiceTokenRequest } from "./validateServiceTokenRequest";
import { MockServiceTokenGeneratorSuccessResult } from "./serviceTokenGenerator/tests/mocks";

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

  describe("Given lambdaHandler is called", () => {
    it("Returns 200 response", async () => {
      const result = await lambdaHandlerConstructor(
        dependencies,
        event,
        buildLambdaContext(),
      );

      expect(mockLogger.getLogMessages()[0].logMessage.message).toBe("STARTED");
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
