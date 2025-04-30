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
    const sendEventResult = await resultSender.sendEvent("SUCCESS");
    if (sendEventResult.isError) {
      logger.log("ERROR_SENDING_CUSTOM_RESOURCE_EVENT", {
        errorMessage: sendEventResult.value.errorMessage,
      });
    }
    return;
  }

  const configResult = new ConfigService().getConfig(dependencies.env);
  if (configResult.isError) {
    logger.log("ENVIRONMENT_VARIABLE_MISSING", {
      errorMessage: configResult.value.errorMessage,
    });
    const sendEventResult = await resultSender.sendEvent("FAILED");
    if (sendEventResult.isError) {
      logger.log("ERROR_SENDING_CUSTOM_RESOURCE_EVENT", {
        errorMessage: sendEventResult.value.errorMessage,
      });
    }
    return;
  }

  const environmentVariables = configResult.value;

  const keyIds = [
    environmentVariables.ENCRYPTION_KEY_ID,
    environmentVariables.VERIFIABLE_CREDENTIAL_SIGNING_KEY_ID,
  ];

  const jwksBuilder = dependencies.jwksBuilder(keyIds);
  const jwksBuilderResult = await jwksBuilder.buildJwks();
  if (jwksBuilderResult.isError) {
    logger.log("INTERNAL_SERVER_ERROR", {
      errorMessage: jwksBuilderResult.value.errorMessage,
    });
    const sendEventResult = await resultSender.sendEvent("FAILED");
    if (sendEventResult.isError) {
      logger.log("ERROR_SENDING_CUSTOM_RESOURCE_EVENT", {
        errorMessage: sendEventResult.value.errorMessage,
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
    const sendEventResult = await resultSender.sendEvent("FAILED");
    if (sendEventResult.isError) {
      logger.log("ERROR_SENDING_CUSTOM_RESOURCE_EVENT", {
        errorMessage: sendEventResult.value.errorMessage,
      });
    }
    return;
  }

  const sendEventResult = await resultSender.sendEvent("SUCCESS");
  if (sendEventResult.isError) {
    logger.log("ERROR_SENDING_CUSTOM_RESOURCE_EVENT", {
      errorMessage: sendEventResult.value.errorMessage,
    });
  }

  logger.log("COMPLETED");
}

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
