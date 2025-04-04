import { Context, SQSBatchResponse, SQSEvent } from "aws-lambda";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { setupLogger } from "../common/logging/setupLogger";

export const lambdaHandlerConstructor = async (
  _dependencies: IDequeueCredentialResultDependencies,
  _event: SQSEvent,
  context: Context,
): Promise<SQSBatchResponse> => {
  setupLogger(context);
  logger.info(LogMessage.DEQUEUE_CREDENTIAL_RESULT_STARTED);
  const processedMessages: IProcessedMessage[] = [];

  logger.info(LogMessage.DEQUEUE_CREDENTIAL_RESULT_PROCESSED_MESSAGES, {
    processedMessages,
  });
  logger.info(LogMessage.DEQUEUE_CREDENTIAL_RESULT_COMPLETED);
  return { batchItemFailures: [] };
};

export interface IDequeueCredentialResultDependencies {
  env: NodeJS.ProcessEnv;
}

interface IProcessedMessage {
  sub: string;
  timestamp: number;
}

const dependencies: IDequeueCredentialResultDependencies = {
  env: process.env,
};

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
