import { Logger } from "../services/logging/logger";
import { MockLoggingAdapter } from "../services/logging/tests/mockLogger";
import { buildLambdaContext } from "../testUtils/mockContext";
import { lambdaHandlerConstructor } from "./jwksHandler";
import { MessageName, registeredLogs } from "./registeredLogs";
import { IJwksDependencies } from "./handlerDependencies";
import { buildCloudFormationCustomResourceEvent } from "../testUtils/mockCloudFormationCustomResourceEvent";
import {
  MockJwksBuilderErrorResult,
  MockJwksBuilderSuccessResult,
} from "./jwksBuilder/tests/mocks";
import {
  MockJwksUploaderErrorResult,
  MockJwksUploaderSuccessResult,
} from "./jwksUploader/tests/mocks";
import {
  MockCustomResourceEventSenderErrorResult,
  MockCustomResourceEventSenderSuccessResult,
} from "./customResourceEventSender/tests/mocks";

describe("Json Web Keys", () => {
  let mockLogger: MockLoggingAdapter<MessageName>;
  let dependencies: IJwksDependencies;
  let mockCustomResourceEventSender: MockCustomResourceEventSenderSuccessResult;

  const env = {
    ENCRYPTION_KEY_ID: "mockEncryptionKeyId",
    VERIFIABLE_CREDENTIAL_SIGNING_KEY_ID:
      "mockVerifiableCredentialSigningKeyId",
    JWKS_BUCKET_NAME: "mockJwksBucketName",
    JWKS_FILE_NAME: "mockJwksFileName",
  };

  beforeEach(() => {
    mockLogger = new MockLoggingAdapter();
    mockCustomResourceEventSender =
      new MockCustomResourceEventSenderSuccessResult();
    dependencies = {
      env,
      logger: () => new Logger(mockLogger, registeredLogs),
      jwksBuilder: () => new MockJwksBuilderSuccessResult(),
      jwksUploader: () => new MockJwksUploaderSuccessResult(),
      customResourceResultSender: () => mockCustomResourceEventSender,
    };
  });

  describe("Environment variable validation", () => {
    describe.each(Object.keys(env))("Given %s is missing", (envVar: string) => {
      it("Logs ENVIRONMENT_VARIABLE_MISSING and sends a 'FAILED' custom resource result", async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        delete dependencies.env[envVar];

        const result = await lambdaHandlerConstructor(
          dependencies,
          buildCloudFormationCustomResourceEvent(),
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages()[1].logMessage.message).toBe(
          "ENVIRONMENT_VARIABLE_MISSING",
        );
        expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
          errorMessage: `No ${envVar}`,
        });
        expect(mockCustomResourceEventSender.getResult()[0].result).toBe(
          "FAILED",
        );
        expect(result).toStrictEqual(undefined);
      });

      it("Logs ERROR_SENDING_CUSTOM_RESOURCE_EVENT when the custom resource result fails to send", async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        delete dependencies.env[envVar];
        dependencies.customResourceResultSender = () =>
          new MockCustomResourceEventSenderErrorResult();

        const result = await lambdaHandlerConstructor(
          dependencies,
          buildCloudFormationCustomResourceEvent(),
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages()[2].logMessage.message).toBe(
          "ERROR_SENDING_CUSTOM_RESOURCE_EVENT",
        );
        expect(mockLogger.getLogMessages()[2].data).toStrictEqual({
          errorMessage: "Error sending Custom Resource event",
        });
        expect(result).toStrictEqual(undefined);
      });
    });

    describe("Given the RequestType is 'Delete'", () => {
      it("Sends a 'SUCCESS' custom resource result", async () => {
        const result = await lambdaHandlerConstructor(
          dependencies,
          buildCloudFormationCustomResourceEvent("Delete"),
          buildLambdaContext(),
        );

        expect(mockCustomResourceEventSender.getResult()[0].result).toBe(
          "SUCCESS",
        );
        expect(result).toStrictEqual(undefined);
      });

      it("Logs ERROR_SENDING_CUSTOM_RESOURCE_EVENT when the custom resource result fails to send", async () => {
        dependencies.customResourceResultSender = () =>
          new MockCustomResourceEventSenderErrorResult();

        const result = await lambdaHandlerConstructor(
          dependencies,
          buildCloudFormationCustomResourceEvent("Delete"),
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages()[1].logMessage.message).toBe(
          "ERROR_SENDING_CUSTOM_RESOURCE_EVENT",
        );
        expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "Error sending Custom Resource event",
        });
        expect(result).toStrictEqual(undefined);
      });
    });

    describe("JWKS Builder", () => {
      describe("Given that building the JWKS fails", () => {
        it("Logs SERVER_ERROR and sends a 'FAILED' custom resource result", async () => {
          dependencies.jwksBuilder = () => new MockJwksBuilderErrorResult();

          const result = await lambdaHandlerConstructor(
            dependencies,
            buildCloudFormationCustomResourceEvent(),
            buildLambdaContext(),
          );

          expect(mockLogger.getLogMessages()[1].logMessage.message).toBe(
            "INTERNAL_SERVER_ERROR",
          );
          expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
            errorMessage: "Error formatting public key as JWK",
          });
          expect(mockCustomResourceEventSender.getResult()[0].result).toBe(
            "FAILED",
          );
          expect(result).toStrictEqual(undefined);
        });

        it("Logs ERROR_SENDING_CUSTOM_RESOURCE_EVENT when the custom resource result fails to send", async () => {
          dependencies.customResourceResultSender = () =>
            new MockCustomResourceEventSenderErrorResult();
          dependencies.jwksBuilder = () => new MockJwksBuilderErrorResult();

          const result = await lambdaHandlerConstructor(
            dependencies,
            buildCloudFormationCustomResourceEvent(),
            buildLambdaContext(),
          );

          expect(mockLogger.getLogMessages()[2].logMessage.message).toBe(
            "ERROR_SENDING_CUSTOM_RESOURCE_EVENT",
          );
          expect(mockLogger.getLogMessages()[2].data).toStrictEqual({
            errorMessage: "Error sending Custom Resource event",
          });
          expect(result).toStrictEqual(undefined);
        });
      });
    });

    describe("JWKS Uploader", () => {
      describe("Given that uploading the JWKS fails", () => {
        it("Logs SERVER_ERROR and send a 'FAILED' custom resource result", async () => {
          dependencies.jwksUploader = () => new MockJwksUploaderErrorResult();

          const result = await lambdaHandlerConstructor(
            dependencies,
            buildCloudFormationCustomResourceEvent(),
            buildLambdaContext(),
          );

          expect(mockLogger.getLogMessages()[1].logMessage.message).toBe(
            "INTERNAL_SERVER_ERROR",
          );
          expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
            errorMessage: "Error uploading file to S3",
          });
          expect(mockCustomResourceEventSender.getResult()[0].result).toBe(
            "FAILED",
          );
          expect(result).toStrictEqual(undefined);
        });

        it("Logs ERROR_SENDING_CUSTOM_RESOURCE_EVENT when the custom resource result fails to send", async () => {
          dependencies.customResourceResultSender = () =>
            new MockCustomResourceEventSenderErrorResult();
          dependencies.jwksUploader = () => new MockJwksUploaderErrorResult();

          const result = await lambdaHandlerConstructor(
            dependencies,
            buildCloudFormationCustomResourceEvent(),
            buildLambdaContext(),
          );

          expect(mockLogger.getLogMessages()[2].logMessage.message).toBe(
            "ERROR_SENDING_CUSTOM_RESOURCE_EVENT",
          );
          expect(mockLogger.getLogMessages()[2].data).toStrictEqual({
            errorMessage: "Error sending Custom Resource event",
          });
          expect(result).toStrictEqual(undefined);
        });
      });
    });
  });

  describe("Given the JWKS is uploaded successfully", () => {
    it("Sends a 'SUCCESS' custom event result", async () => {
      const result = await lambdaHandlerConstructor(
        dependencies,
        buildCloudFormationCustomResourceEvent(),
        buildLambdaContext(),
      );

      expect(mockCustomResourceEventSender.getResult()[0].result).toBe(
        "SUCCESS",
      );
      expect(result).toStrictEqual(undefined);
    });

    it("Logs ERROR_SENDING_CUSTOM_RESOURCE_EVENT when the custom resource result fails to send", async () => {
      dependencies.customResourceResultSender = () =>
        new MockCustomResourceEventSenderErrorResult();

      const result = await lambdaHandlerConstructor(
        dependencies,
        buildCloudFormationCustomResourceEvent(),
        buildLambdaContext(),
      );

      expect(mockLogger.getLogMessages()[1].logMessage.message).toBe(
        "ERROR_SENDING_CUSTOM_RESOURCE_EVENT",
      );
      expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
        errorMessage: "Error sending Custom Resource event",
      });
      expect(result).toStrictEqual(undefined);
    });
  });
});
