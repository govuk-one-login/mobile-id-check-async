import { Context, SQSEvent } from "aws-lambda";
import { logger } from "../common/logging/logger";

export const lambdaHandlerConstructor = async (
  _dependencies: IDequeueCredentialResultDependencies,
  _event: SQSEvent,
  context: Context,
): Promise<void> => {
  logger.addContext(context);
  logger.info("STARTED");

  logger.info("COMPLETED");
};

export interface IDequeueCredentialResultDependencies {
  env: NodeJS.ProcessEnv;
}

const dependencies: IDequeueCredentialResultDependencies = {
  env: process.env,
};

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
