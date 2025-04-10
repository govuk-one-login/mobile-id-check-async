import {
  Context,
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
  SQSRecord,
} from "aws-lambda";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { setupLogger } from "../common/logging/setupLogger";
import { getTimeToLiveInSeconds } from "../common/utils/utils";
import { PutItemCredentialResult } from "./credentialResultRegistry/putItemOperation/putItemCredentialResult";
import { getDequeueCredentialResultConfig } from "./dequeueCredentialResultConfig";
import { validateCredentialResult } from "./validateCredentialResult/validateCredentialResult";
import {
  IDequeueCredentialResultDependencies,
  handlerDependencies,
} from "./handlerDependencies";

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
    batchItemFailures.push(...getBatchItemFailures(event.Records));
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
      const timeToLiveInSeconds = getTimeToLiveInSeconds(
        config.CREDENTIAL_RESULT_TTL_DURATION_IN_SECONDS,
      );
      const credentialResultRegistry = dependencies.getCredentialResultRegistry(
        {
          tableName: config.CREDENTIAL_RESULTS_TABLE_NAME,
          ttlInSeconds: timeToLiveInSeconds,
        },
      );
      const credentResultData = validateCredentialResultResponse.value;
      const { sub, sentTimestamp } = credentResultData;
      const compositeKeyData = { sub, sentTimestamp };
      const putItemResult = await credentialResultRegistry.putItem(
        new PutItemCredentialResult(compositeKeyData),
      );

      if (putItemResult.isError) {
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }

      logger.info(
        LogMessage.DEQUEUE_CREDENTIAL_RESULT_PROCESS_MESSAGE_SUCCESS,
        {
          processedMessage: credentResultData,
        },
      );
    }
  }

  logger.info(LogMessage.DEQUEUE_CREDENTIAL_RESULT_COMPLETED);
  return { batchItemFailures };
};

function getBatchItemFailures(eventRecords: SQSRecord[]) {
  return eventRecords.map((record) => ({ itemIdentifier: record.messageId }));
}

export const lambdaHandler = lambdaHandlerConstructor.bind(
  null,
  handlerDependencies,
);
