import { Logger } from "../../../services/logging/logger";
import { MockLoggingAdapter } from "../../../services/logging/tests/mockLoggingAdapter";
import { buildLambdaContext } from "../../../testUtils/mockContext";
import { MessageName, registeredLogs } from "../registeredLogs";
import { lambdaHandlerConstructor } from "../tokenHandler";
import { APIGatewayProxyEvent } from "aws-lambda";
import { TokenDependencies } from "../handlerDependencies";
import { buildRequest } from "../../../testUtils/mockRequest";
import {
  MockTokenSignerErrorResult,
  MockTokenSignerSuccessResult,
} from "../tokenSigner/tests/mocks";
import {
  MockKeyRetrieverErrorResult,
  MockKeyRetrieverSuccessResult,
} from "../keyRetriever/tests/mocks";
import { validateServiceTokenRequest } from "../validateServiceTokenRequest/validateServiceTokenRequest";
import {
  MockTokenEncrypterErrorResult,
  MockTokenEncrypterSuccessResult,
} from "../tokenEncrypter/tests/mocks";

describe("Token Handler", () => {
  let mockLoggingAdapter: MockLoggingAdapter<MessageName>;
  let event: APIGatewayProxyEvent;
  let dependencies: TokenDependencies;

  const env = {
    STS_MOCK_BASE_URL: "dummyStsMocksBaseUrl",
    ASYNC_BACKEND_BASE_URL: "dummyAsyncBackendBaseUrl",
    KEY_STORAGE_BUCKET_NAME: "dummyKeyStorageBucketName",
  };

  beforeEach(() => {
    event = buildRequest(
      "subject_token=testSub&scope=idCheck.activeSession.read&subject_token_type=urn:ietf:params:oauth:token-type:access_token&grant_type=urn:ietf:params:oauth:grant-type:token-exchange",
    );
    mockLoggingAdapter = new MockLoggingAdapter();
    dependencies = {
      env,
      logger: () => new Logger(mockLoggingAdapter, registeredLogs),
      validateServiceTokenRequest: validateServiceTokenRequest,
      tokenSigner: () => new MockTokenSignerSuccessResult(),
      keyRetriever: () => new MockKeyRetrieverSuccessResult(),
      tokenEncrypter: () => new MockTokenEncrypterSuccessResult(),
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
    describe("Given the request body is falsy", () => {
      it("Logs INVALID_REQUEST and returns 400 Bad Request", async () => {
        event = buildRequest(undefined);

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

    describe.each([
      [
        "subject_token",
        "scope=idCheck.activeSession.read&subject_token_type=urn:ietf:params:oauth:token-type:access_token&grant_type=urn:ietf:params:oauth:grant-type:token-exchange",
      ],
      [
        "scope",
        "subject_token=testSub&subject_token_type=urn:ietf:params:oauth:token-type:access_token&grant_type=urn:ietf:params:oauth:grant-type:token-exchange",
      ],
      [
        "subject_token_type",
        "subject_token=testSub&scope=idCheck.activeSession.read&grant_type=urn:ietf:params:oauth:grant-type:token-exchange",
      ],
      [
        "grant_type",
        "subject_token=testSub&scope=idCheck.activeSession.read&subject_token_type=urn:ietf:params:oauth:token-type:access_token",
      ],
    ])(
      "Given the request body is missing the param '%s'",
      (param: string, body: string) => {
        it("Logs INVALID_REQUEST and returns 400 Bad Request", async () => {
          event = buildRequest(body);

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
            errorMessage: `Missing ${param}`,
          });
          expect(result.statusCode).toStrictEqual(400);
          expect(result.body).toStrictEqual(
            `{"error":"invalid_request","error_description":"Missing ${param}"}`,
          );
        });
      },
    );

    describe.each([
      [
        "scope",
        "subject_token=testSub&scope=invalidScope&subject_token_type=urn:ietf:params:oauth:token-type:access_token&grant_type=urn:ietf:params:oauth:grant-type:token-exchange",
      ],
      [
        "subject_token_type",
        "subject_token=testSub&scope=idCheck.activeSession.read&subject_token_type=invalidSubjectTokenType&grant_type=urn:ietf:params:oauth:grant-type:token-exchange",
      ],
      [
        "grant_type",
        "subject_token=testSub&scope=idCheck.activeSession.read&subject_token_type=urn:ietf:params:oauth:token-type:access_token&grant_type=invalidGrantType",
      ],
    ])(
      "Given the value of the '%s' param is invalid/not supported",
      (param: string, body: string) => {
        it("Logs INVALID_REQUEST and returns 400 Bad Request", async () => {
          event = buildRequest(body);

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
            errorMessage: `Unsupported ${param}`,
          });
          expect(result.statusCode).toStrictEqual(400);
          expect(result.body).toStrictEqual(
            `{"error":"invalid_request","error_description":"Unsupported ${param}"}`,
          );
        });
      },
    );
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
    describe("Given an error happens trying to create a signed token", () => {
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

  describe("Token Encrypter", () => {
    describe("Given an error happens trying to encrypt the token", () => {
      it("Returns 500 Server Error", async () => {
        dependencies.tokenEncrypter = () => new MockTokenEncrypterErrorResult();

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
          errorMessage: "Some error encrypting token",
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
            access_token: "header.encrypted_key.iv.ciphertext.tag",
            token_type: "Bearer",
            expires_in: 180,
          }),
        });
      });
    });
  });
});
