import { CloudFormationCustomResourceEvent, Context } from "aws-lambda";
import { ConfigService } from "./configService/configService";
import { dependencies, IJwksDependencies } from "./handlerDependencies";

export async function lambdaHandlerConstructor(
  dependencies: IJwksDependencies,
  event: CloudFormationCustomResourceEvent,
  context: Context,
): Promise<void> {
  const logger = dependencies.logger();
  logger.addContext(context);
  logger.log("STARTED");

  const resultSender = dependencies.customResourceResultSender(event, context);

  if (event.RequestType === "Delete") {
    const sendEventResponse = await resultSender.sendEvent("SUCCESS");
    if (sendEventResponse.isError) {
      logger.log("ERROR_SENDING_CUSTOM_RESOURCE_EVENT", {
        errorMessage: sendEventResponse.value.errorMessage,
      });
    }
    return;
  }

  const configResult = new ConfigService().getConfig(dependencies.env);
  if (configResult.isError) {
    logger.log("ENVIRONMENT_VARIABLE_MISSING", {
      errorMessage: configResult.value.errorMessage,
    });
    const sendEventResponse = await resultSender.sendEvent("FAILED");
    if (sendEventResponse.isError) {
      logger.log("ERROR_SENDING_CUSTOM_RESOURCE_EVENT", {
        errorMessage: sendEventResponse.value.errorMessage,
      });
    }
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
    const sendEventResponse = await resultSender.sendEvent("FAILED");
    if (sendEventResponse.isError) {
      logger.log("ERROR_SENDING_CUSTOM_RESOURCE_EVENT", {
        errorMessage: sendEventResponse.value.errorMessage,
      });
    }
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
    const sendEventResponse = await resultSender.sendEvent("FAILED");
    if (sendEventResponse.isError) {
      logger.log("ERROR_SENDING_CUSTOM_RESOURCE_EVENT", {
        errorMessage: sendEventResponse.value.errorMessage,
      });
    }
    return;
  }

  const sendEventResponse = await resultSender.sendEvent("SUCCESS");
  if (sendEventResponse.isError) {
    logger.log("ERROR_SENDING_CUSTOM_RESOURCE_EVENT", {
      errorMessage: sendEventResponse.value.errorMessage,
    });
  }

  logger.log("COMPLETED");

  return;
}

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
