import {
  Context,
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
} from "aws-lambda";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { setupLogger } from "../common/logging/setupLogger";
import { validateCredentialResult } from "./validateCredentialResult/validateCredentialResult";

export const lambdaHandlerConstructor = async (
  _dependencies: IDequeueCredentialResultDependencies,
  event: SQSEvent,
  context: Context,
): Promise<SQSBatchResponse> => {
  setupLogger(context);
  logger.info(LogMessage.DEQUEUE_CREDENTIAL_RESULT_STARTED);
  const processedMessages: IProcessedMessage[] = [];
  const batchItemFailures: SQSBatchItemFailure[] = [];

  for (const record of event.Records) {
    const validateCredentialResultResponse = validateCredentialResult(record);
    if (validateCredentialResultResponse.isError) {
      const { errorMessage } = validateCredentialResultResponse.value;
      logger.error(LogMessage.DEQUEUE_CREDENTIAL_RESULT_INVALID_RESULT, {
        errorMessage,
      });

      continue;
    }

    const { sub, timestamp } = validateCredentialResultResponse.value;
    processedMessages.push({ sub, timestamp });
  }

  // const processedMessages = validateCredentialResultResponse.value;
  logger.info(LogMessage.DEQUEUE_CREDENTIAL_RESULT_PROCESSED_MESSAGES, {
    processedMessages,
  });

  logger.info(LogMessage.DEQUEUE_CREDENTIAL_RESULT_COMPLETED);
  return { batchItemFailures };
};

export interface IDequeueCredentialResultDependencies {
  env: NodeJS.ProcessEnv;
}

export interface IProcessedMessage {
  sub: string;
  timestamp: string;
}

const dependencies: IDequeueCredentialResultDependencies = {
  env: process.env,
};

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
