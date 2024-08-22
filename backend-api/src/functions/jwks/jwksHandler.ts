import {
  CloudFormationCustomResourceEvent,
  Context,
} from "aws-lambda";
import { ConfigService } from "./configService/configService";
import {
  dependencies,
  IJwksDependencies,
} from "./handlerDependencies";


export const lambdaHandlerConstructor = (
    dependencies: IJwksDependencies,
) => {
  return async (
      event: CloudFormationCustomResourceEvent,
      context: Context,
  ): Promise<void> => {
    const logger = dependencies.logger();
    logger.addContext(context);
    logger.log("STARTED");

    const configResult = new ConfigService().getConfig(dependencies.env);
    if (configResult.isError) {
      logger.log("ENVIRONMENT_VARIABLE_MISSING", {
        errorMessage: configResult.value.errorMessage,
      });
      return;
    }

    return;
  }
}

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);