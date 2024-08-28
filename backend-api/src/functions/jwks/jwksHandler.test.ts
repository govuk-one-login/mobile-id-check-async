import { Logger } from "../services/logging/logger";
import { MockLoggingAdapter } from "../services/logging/tests/mockLogger";
import { buildLambdaContext } from "../testUtils/mockContext";
import { lambdaHandlerConstructor } from "./jwksHandler";
import { MessageName, registeredLogs } from "./registeredLogs";
import { IJwksDependencies } from "./handlerDependencies";
import { getCloudFormationCustomResourceEvent } from "../testUtils/mockCloudFormationCustomResourceRevent";
import {
  MockJwksBuilderErrorResult,
  MockJwksBuilderSuccessResult,
} from "./jwksBuilder/tests/mocks";
import {
  MockJwksUploaderErrorResult,
  MockJwksUploaderSuccessResult,
} from "./jwksUploader/tests/mocks";
import { MockCustomResourceResultSenderSuccessResult } from "./customResourceResultSender/tests/mocks";

describe("Json Web Keys", () => {
  let mockLogger: MockLoggingAdapter<MessageName>;
  let dependencies: IJwksDependencies;
  let mockCustomResourceResultSender: MockCustomResourceResultSenderSuccessResult;

  const env = {
    ENCRYPTION_KEY_ID: "mockKeyId",
    JWKS_BUCKET_NAME: "mockJwksBucketName",
    JWKS_FILE_NAME: "mockJwksFileName",
  };

  beforeEach(() => {
    mockLogger = new MockLoggingAdapter();
    mockCustomResourceResultSender =
      new MockCustomResourceResultSenderSuccessResult();
    dependencies = {
      env,
      logger: () => new Logger(mockLogger, registeredLogs),
      jwksBuilder: () => new MockJwksBuilderSuccessResult(),
      jwksUploader: () => new MockJwksUploaderSuccessResult(),
      customResourceResultSender: () => mockCustomResourceResultSender,
    };
  });

  describe("Fails to Upload JWKS", () => {
    describe("Environment variable validation", () => {
      describe.each(Object.keys(env))(
        "Given %s is missing",
        (envVar: string) => {
          it("Logs ENVIRONMENT_VARIABLE_MISSING and sends 'FAILED' result", async () => {
            dependencies.env = JSON.parse(JSON.stringify(env));
            delete dependencies.env[envVar];

            const result = await lambdaHandlerConstructor(
              dependencies,
              getCloudFormationCustomResourceEvent(),
              buildLambdaContext(),
            );
            expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
              "ENVIRONMENT_VARIABLE_MISSING",
            );
            expect(mockLogger.getLogMessages()[0].data).toStrictEqual({
              errorMessage: `No ${envVar}`,
            });
            expect(mockCustomResourceResultSender.getResult()[0].result).toBe(
              "FAILED",
            );
            expect(result).toStrictEqual(undefined);
          });
        },
      );
    });

    describe("CloudFormation custom resource event", () => {
      describe("Given the event RequestType is 'Delete'", () => {
        it("Sends a 'Success' result", async () => {
          const result = await lambdaHandlerConstructor(
            dependencies,
            getCloudFormationCustomResourceEvent("Delete"),
            buildLambdaContext(),
          );

          expect(mockCustomResourceResultSender.getResult()[0].result).toBe(
            "SUCCESS",
          );
          expect(result).toStrictEqual(undefined);
        });
      });
    });

    describe("JWKS Builder", () => {
      describe("Given that building the JWKS fails", () => {
        it("Logs SERVER_ERROR and send a 'FAILED' result", async () => {
          dependencies.jwksBuilder = () => new MockJwksBuilderErrorResult();

          const result = await lambdaHandlerConstructor(
            dependencies,
            getCloudFormationCustomResourceEvent(),
            buildLambdaContext(),
          );

          expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
            "INTERNAL_SERVER_ERROR",
          );
          expect(mockLogger.getLogMessages()[0].data).toStrictEqual({
            errorMessage: "Error formatting public key as JWK",
          });
          expect(mockCustomResourceResultSender.getResult()[0].result).toBe(
            "FAILED",
          );
          expect(result).toStrictEqual(undefined);
        });
      });
    });

    describe("JWKS Uploader", () => {
      describe("Given that uploading the JWKS fails", () => {
        it("Logs SERVER_ERROR and send a 'FAILED' result", async () => {
          dependencies.jwksUploader = () => new MockJwksUploaderErrorResult();

          const result = await lambdaHandlerConstructor(
            dependencies,
            getCloudFormationCustomResourceEvent(),
            buildLambdaContext(),
          );

          expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
            "INTERNAL_SERVER_ERROR",
          );
          expect(mockLogger.getLogMessages()[0].data).toStrictEqual({
            errorMessage: "Error uploading file to S3",
          });
          expect(mockCustomResourceResultSender.getResult()[0].result).toBe(
            "FAILED",
          );
          expect(result).toStrictEqual(undefined);
        });
      });
    });
  });

  describe("Successful Upload", () => {
    describe("Given the JWKS is published successfully", () => {
      it("Sends a 'Success' result", async () => {
        const result = await lambdaHandlerConstructor(
          dependencies,
          getCloudFormationCustomResourceEvent(),
          buildLambdaContext(),
        );

        expect(mockCustomResourceResultSender.getResult()[0].result).toBe(
          "SUCCESS",
        );
        expect(result).toStrictEqual(undefined);
      });
    });
  });
});
