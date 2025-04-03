import { expect } from "@jest/globals";
import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { logger } from "../../../common/logging/logger";
import { Logger } from "../../../services/logging-OLD/logger";
import { MockLoggingAdapter } from "../../../services/logging-OLD/tests/mockLoggingAdapter";
import "../../../testUtils/matchers";
import { buildLambdaContext } from "../../../testUtils/mockContext";
import { buildRequest } from "../../../testUtils/mockRequest";
import { TokenDependencies } from "../handlerDependencies";
import {
  MockKeyRetrieverErrorResult,
  MockKeyRetrieverSuccessResult,
} from "../keyRetriever/tests/mocks";
import { MessageName, registeredLogs } from "../registeredLogs";
import {
  MockTokenEncrypterErrorResult,
  MockTokenEncrypterSuccessResult,
} from "../tokenEncrypter/tests/mocks";
import { lambdaHandlerConstructor } from "../tokenHandler";
import {
  MockTokenSignerErrorResult,
  MockTokenSignerSuccessResult,
} from "../tokenSigner/tests/mocks";
import { validateServiceTokenRequest } from "../validateServiceTokenRequest/validateServiceTokenRequest";

describe("Token Handler", () => {
  let mockLoggingAdapter: MockLoggingAdapter<MessageName>;
  let event: APIGatewayProxyEvent;
  let dependencies: TokenDependencies;
  let context: Context;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  const env = {
    STS_MOCK_BASE_URL: "dummyStsMocksBaseUrl",
    ASYNC_BACKEND_BASE_URL: "dummyAsyncBackendBaseUrl",
    KEY_STORAGE_BUCKET_NAME: "dummyKeyStorageBucketName",
  };

  beforeEach(() => {
    event = buildRequest({
      body: "subject_token=testSub&scope=idCheck.activeSession.read&subject_token_type=urn:ietf:params:oauth:token-type:access_token&grant_type=urn:ietf:params:oauth:grant-type:token-exchange",
    });
    mockLoggingAdapter = new MockLoggingAdapter();
    dependencies = {
      env,
      logger: () => new Logger(mockLoggingAdapter, registeredLogs),
      validateServiceTokenRequest: validateServiceTokenRequest,
      tokenSigner: () => new MockTokenSignerSuccessResult(),
      keyRetriever: () => new MockKeyRetrieverSuccessResult(),
      tokenEncrypter: () => new MockTokenEncrypterSuccessResult(),
    };
    context = buildLambdaContext();
    consoleInfoSpy = jest.spyOn(console, "info");
    consoleErrorSpy = jest.spyOn(console, "error");
  });

  describe("On every invocation", () => {
    beforeEach(async () => {
      await lambdaHandlerConstructor(dependencies, event, context);
    });
    it("Adds context and version to log attributes and logs STARTED message", () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "TEST_RESOURCES_STS_MOCK_STARTED",
        functionVersion: "1",
        function_arn: "arn:12345", // example field to verify that context has been added
      });
    });
    it("Clears pre-existing log attributes", async () => {
      logger.appendKeys({ testKey: "testValue" });
      await lambdaHandlerConstructor(dependencies, event, context);
      expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
        testKey: "testValue",
      });
    });
  });

  describe("Environment variable validation", () => {
    describe.each(Object.keys(env))("Given %s is missing", (envVar: string) => {
      it("Logs INVALID_CONFIG and returns 500 Server Error", async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        delete dependencies.env[envVar];

        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "TEST_RESOURCES_STS_MOCK_INVALID_CONFIG",
        });
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
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
        event = buildRequest({ body: undefined });

        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "TEST_RESOURCES_STS_MOCK_REQUEST_BODY_INVALID",
        });
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
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
        it("Logs REQUEST_BODY_INVALID and returns 400 Bad Request", async () => {
          event = buildRequest({ body });

          const result = await lambdaHandlerConstructor(
            dependencies,
            event,
            buildLambdaContext(),
          );

          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "TEST_RESOURCES_STS_MOCK_REQUEST_BODY_INVALID",
          });
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
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
        it("Logs REQUEST_BODY_INVALID and returns 400 Bad Request", async () => {
          event = buildRequest({ body });

          const result = await lambdaHandlerConstructor(
            dependencies,
            event,
            buildLambdaContext(),
          );

          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "TEST_RESOURCES_STS_MOCK_REQUEST_BODY_INVALID",
          });
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
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

        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "TEST_RESOURCES_STS_MOCK_FAILURE_RETRIEVING_SIGNING_KEY",
        });
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
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

        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "TEST_RESOURCES_STS_MOCK_FAILURE_SIGNING_TOKEN",
        });
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
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

        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "TEST_RESOURCES_STS_MOCK_FAILURE_ENCRYPTING_TOKEN",
        });
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
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

        expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
          messageCode: "TEST_RESOURCES_STS_MOCK_COMPLETED",
        });
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
