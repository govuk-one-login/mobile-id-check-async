import { CloudFormationCustomResourceEvent, Context } from "aws-lambda";
import { ConfigService } from "./configService/configService";
import { dependencies, IJwksDependencies } from "./handlerDependencies";

export const lambdaHandlerConstructor = (dependencies: IJwksDependencies) => {
  return async (
    event: CloudFormationCustomResourceEvent,
    context: Context,
  ): Promise<void> => {
    console.log(JSON.stringify(event));
    const resultSender = dependencies.customResourceResultSender(
      event,
      context,
    );

    const logger = dependencies.logger();
    logger.addContext(context);
    logger.log("STARTED");

    const configResult = new ConfigService().getConfig(dependencies.env);
    if (configResult.isError) {
      logger.log("ENVIRONMENT_VARIABLE_MISSING", {
        errorMessage: configResult.value.errorMessage,
      });
      await resultSender.sendResult("FAILED");
      return;
    }

    console.log(JSON.stringify(configResult.value));

    const environmentVariables = configResult.value;
    console.log(JSON.stringify(environmentVariables));

    const jwksBuilder = dependencies.jwksBuilder(environmentVariables.KEY_ID);
    const getJwksResult = await jwksBuilder.buildJwks();
    if (getJwksResult.isError) {
      logger.log("INTERNAL_SERVER_ERROR", {
        errorMessage: getJwksResult.value.errorMessage,
      });
      await resultSender.sendResult("FAILED");
      return;
    }

    const jwks = getJwksResult.value;
    const jwksUploader = dependencies.jwksUploader();
    const uploadJwksResult = await jwksUploader.uploadJwks(
      jwks,
      environmentVariables.JWKS_BUCKET_NAME,
      environmentVariables.JWKS_FILE_NAME,
    );
    if (uploadJwksResult.isError) {
      logger.log("INTERNAL_SERVER_ERROR", {
        errorMessage: uploadJwksResult.value.errorMessage,
      });
      await resultSender.sendResult("FAILED");
      return;
    }

    await resultSender.sendResult("SUCCESS");
    return;
  };
};

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
