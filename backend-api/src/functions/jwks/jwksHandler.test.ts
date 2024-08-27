import { Logger } from "../services/logging/logger";
import { MockLoggingAdapter } from "../services/logging/tests/mockLogger";
import { buildLambdaContext } from "../testUtils/mockContext";
import { lambdaHandlerConstructor } from "./jwksHandler";
import { MessageName, registeredLogs } from "./registeredLogs";
import { IJwksDependencies } from "./handlerDependencies";
import { getCloudFormationCustomResourceEvent } from "../testUtils/mockCloudFormationCustomResourceRevent";
import { MockJwksBuilderSuccessResult } from "./jwksBuilder/tests/mocks";
import { MockJwksUploaderSuccessResult } from "./jwksUploader/tests/mocks";
import { MockCustomResourceResultSenderSuccessResult } from "./customResourceResultSender/tests/mocks";

describe("Json Web Keys", () => {
  let mockLogger: MockLoggingAdapter<MessageName>;
  let dependencies: IJwksDependencies;

  const env = {
    KEY_ID: "mockKeyId",
    JWKS_BUCKET_NAME: "mockJwksBucketName",
    JWKS_FILE_NAME: "mockJwksFileName",
  };

  beforeEach(() => {
    mockLogger = new MockLoggingAdapter();
    dependencies = {
      env,
      logger: () => new Logger(mockLogger, registeredLogs),
      jwksBuilder: () => new MockJwksBuilderSuccessResult(),
      jwksUploader: () => new MockJwksUploaderSuccessResult(),
      customResourceResultSender: () =>
        new MockCustomResourceResultSenderSuccessResult(),
    };
  });

  describe("Environment variable validation", () => {
    describe.each(Object.keys(env))("Given %s is missing", (envVar: string) => {
      it("Returns a 500 Server Error response", async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        delete dependencies.env[envVar];
        const result = await lambdaHandlerConstructor(dependencies)(
          getCloudFormationCustomResourceEvent(),
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages()[1].logMessage.message).toBe(
          "ENVIRONMENT_VARIABLE_MISSING",
        );
        expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
          errorMessage: `No ${envVar}`,
        });
        expect(result).toStrictEqual(undefined);
      });
    });
  });
});
