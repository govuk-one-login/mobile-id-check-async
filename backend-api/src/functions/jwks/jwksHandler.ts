import { CloudFormationCustomResourceEvent, Context } from "aws-lambda";
import { ConfigService } from "./configService/configService";
import { dependencies, IJwksDependencies } from "./handlerDependencies";

export async function lambdaHandlerConstructor(
  dependencies: IJwksDependencies,
  event: CloudFormationCustomResourceEvent,
  context: Context,
): Promise<void> {
  const resultSender = dependencies.customResourceResultSender(event, context);

  const logger = dependencies.logger();
  logger.addContext(context);

  if (event.RequestType === "Delete") {
    await resultSender.sendResult("SUCCESS");
    return;
  }

  const configResult = new ConfigService().getConfig(dependencies.env);
  if (configResult.isError) {
    logger.log("ENVIRONMENT_VARIABLE_MISSING", {
      errorMessage: configResult.value.errorMessage,
    });
    await resultSender.sendResult("FAILED");
    return;
  }

  const environmentVariables = configResult.value;

  const jwksBuilder = dependencies.jwksBuilder(
    environmentVariables.ENCRYPTION_KEY_ID,
  );
  const jwksBuilderResult = await jwksBuilder.buildJwks();
  if (jwksBuilderResult.isError) {
    logger.log("INTERNAL_SERVER_ERROR", {
      errorMessage: jwksBuilderResult.value.errorMessage,
    });
    await resultSender.sendResult("FAILED");
    return;
  }

  const jwks = jwksBuilderResult.value;
  const jwksUploader = dependencies.jwksUploader();
  const jwksUploaderResult = await jwksUploader.uploadJwks(
    jwks,
    environmentVariables.JWKS_BUCKET_NAME,
    environmentVariables.JWKS_FILE_NAME,
  );
  if (jwksUploaderResult.isError) {
    logger.log("INTERNAL_SERVER_ERROR", {
      errorMessage: jwksUploaderResult.value.errorMessage,
    });
    await resultSender.sendResult("FAILED");
    return;
  }

  await resultSender.sendResult("SUCCESS");
  return;
}

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
