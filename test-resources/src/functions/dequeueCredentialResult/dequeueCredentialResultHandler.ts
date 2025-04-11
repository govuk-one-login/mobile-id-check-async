import {
  Context,
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
} from "aws-lambda";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { setupLogger } from "../common/logging/setupLogger";
import { PutItemCredentialResult } from "./credentialResultRegistry/putItemOperation/putItemCredentialResult";
import { getDequeueCredentialResultConfig } from "./dequeueCredentialResultConfig";
import {
  IDequeueCredentialResultDependencies,
  handlerDependencies,
} from "./handlerDependencies";
import { validateCredentialResult } from "./validateCredentialResult/validateCredentialResult";

export const lambdaHandlerConstructor = async (
  dependencies: IDequeueCredentialResultDependencies,
  event: SQSEvent,
  context: Context,
): Promise<SQSBatchResponse> => {
  setupLogger(context);
  logger.info(LogMessage.DEQUEUE_CREDENTIAL_RESULT_STARTED);
  const batchItemFailures: SQSBatchItemFailure[] = [];

  const configResult = getDequeueCredentialResultConfig(dependencies.env);
  if (configResult.isError) {
    return { batchItemFailures };
  }
  const config = configResult.value;

  for (const record of event.Records) {
    const validateCredentialResultResponse = validateCredentialResult(record);
    if (validateCredentialResultResponse.isError) {
      const { errorMessage } = validateCredentialResultResponse.value;
      logger.error(LogMessage.DEQUEUE_CREDENTIAL_RESULT_MESSAGE_INVALID, {
        errorMessage,
      });
    } else {
      const credentialResultRegistry = dependencies.getCredentialResultRegistry(
        {
          tableName: config.CREDENTIAL_RESULT_TABLE_NAME,
        },
      );
      const credentResultData = validateCredentialResultResponse.value;
      const putItemResult = await credentialResultRegistry.putItem(
        new PutItemCredentialResult({
          ...credentResultData,
          ttlDurationInSeconds:
            config.CREDENTIAL_RESULT_TTL_DURATION_IN_SECONDS,
        }),
      );
      if (putItemResult.isError) {
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }

      const { compositeKeyData } = credentResultData;
      logger.info(
        LogMessage.DEQUEUE_CREDENTIAL_RESULT_PROCESS_MESSAGE_SUCCESS,
        {
          processedMessage: compositeKeyData,
        },
      );
    }
  }

  logger.info(LogMessage.DEQUEUE_CREDENTIAL_RESULT_COMPLETED);
  return { batchItemFailures };
};

export const lambdaHandler = lambdaHandlerConstructor.bind(
  null,
  handlerDependencies,
);
