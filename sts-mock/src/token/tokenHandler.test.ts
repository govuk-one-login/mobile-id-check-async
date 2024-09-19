import { Logger } from "../services/logging/logger";
import { MockLoggingAdapter } from "../services/logging/tests/mockLoggingAdapter";
import { buildLambdaContext } from "../testUtils/mockContext";
import { MessageName, registeredLogs } from "./registeredLogs";
import { lambdaHandlerConstructor } from "./tokenHandler";
import { APIGatewayProxyEvent } from "aws-lambda";
import { Dependencies } from "./handlerDependencies";
import { buildTokenRequest } from "../testUtils/mockRequest";
import {
  MockTokenSignerErrorResult,
  MockTokenSignerSuccessResult,
} from "./tokenSigner/tests/mocks";
import {
  MockKeyRetrieverErrorResult,
  MockKeyRetrieverSuccessResult,
} from "./keyRetriever/tests/mocks";
import { validateServiceTokenRequest } from "./validateServiceTokenRequest/validateServiceTokenRequest";

describe("Token Handler", () => {
  let mockLoggingAdapter: MockLoggingAdapter<MessageName>;
  let event: APIGatewayProxyEvent;
  let dependencies: Dependencies;

  const env = {
    MOCK_STS_BASE_URL: "mockStsBaseUrl",
    KEY_STORAGE_BUCKET_NAME: "mockKeyStorageBucketName",
  };

  beforeEach(() => {
    event = buildTokenRequest(
      "subject_token=testSub&scope=mock_service_name.mock_apiName.mock_accessLevel",
    );
    mockLoggingAdapter = new MockLoggingAdapter();
    dependencies = {
      env,
      logger: () => new Logger(mockLoggingAdapter, registeredLogs),
      validateServiceTokenRequest: validateServiceTokenRequest,
      tokenSigner: () => new MockTokenSignerSuccessResult(),
      keyRetriever: () => new MockKeyRetrieverSuccessResult(),
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

        expect(
          mockLoggingAdapter.getLogMessages()[1].logMessage.message,
        ).toStrictEqual("ENVIRONMENT_VARIABLE_MISSING");
        expect(mockLoggingAdapter.getLogMessages()[1].data).toStrictEqual({
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
    describe("Given the request body is invalid (e.g. undefined)", () => {
      it("Returns 400 Bad Request", async () => {
        event = buildTokenRequest(undefined);

        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(
          mockLoggingAdapter.getLogMessages()[0].logMessage.message,
        ).toStrictEqual("STARTED");
        expect(
          mockLoggingAdapter.getLogMessages()[1].logMessage.message,
        ).toStrictEqual("INVALID_REQUEST");
        expect(mockLoggingAdapter.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "Missing request body",
        });
        expect(result.statusCode).toStrictEqual(400);
        expect(result.body).toStrictEqual(
          '{"error":"invalid_request","error_description":"Missing request body"}',
        );
      });
    });
  });

  describe("Key Retriever", () => {
    describe("Given an error happens trying to get the signing key from S3", () => {
      it("Returns 500 Server Error", async () => {
        dependencies.keyRetriever = () => new MockKeyRetrieverErrorResult();

        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(
          mockLoggingAdapter.getLogMessages()[0].logMessage.message,
        ).toStrictEqual("STARTED");
        expect(
          mockLoggingAdapter.getLogMessages()[1].logMessage.message,
        ).toStrictEqual("INTERNAL_SERVER_ERROR");
        expect(mockLoggingAdapter.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "Some S3 error",
        });
        expect(result.statusCode).toStrictEqual(500);
        expect(result.body).toStrictEqual(
          '{"error":"server_error","error_description":"Server Error"}',
        );
      });
    });
  });

  describe("Token Signer", () => {
    describe("Given an error happens trying to crate a signed token", () => {
      it("Returns 500 Server Error", async () => {
        dependencies.tokenSigner = () => new MockTokenSignerErrorResult();

        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(
          mockLoggingAdapter.getLogMessages()[0].logMessage.message,
        ).toStrictEqual("STARTED");
        expect(
          mockLoggingAdapter.getLogMessages()[1].logMessage.message,
        ).toStrictEqual("INTERNAL_SERVER_ERROR");
        expect(mockLoggingAdapter.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "Some signing error",
        });
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

        expect(
          mockLoggingAdapter.getLogMessages()[0].logMessage.message,
        ).toStrictEqual("STARTED");
        expect(
          mockLoggingAdapter.getLogMessages()[1].logMessage.message,
        ).toStrictEqual("COMPLETED");
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
