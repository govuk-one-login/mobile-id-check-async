import { Context, SQSEvent } from "aws-lambda";
import { logger } from "../common/logging/logger";
import { setupLogger } from "../common/logging/setupLogger";
import { LogMessage } from "../common/logging/LogMessage";

export const lambdaHandlerConstructor = async (
  _dependencies: IDequeueCredentialResultDependencies,
  _event: SQSEvent,
  context: Context,
): Promise<void> => {
  setupLogger(context);
  logger.info(LogMessage.DEQUEUE_CREDENTIAL_RESULT_STARTED);

  logger.info(LogMessage.DEQUEUE_CREDENTIAL_RESULT_COMPLETED);
};

export interface IDequeueCredentialResultDependencies {
  env: NodeJS.ProcessEnv;
}

const dependencies: IDequeueCredentialResultDependencies = {
  env: process.env,
};

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
