import {
  Context,
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
  SQSRecord,
} from "aws-lambda";
import {
  DynamoDBAdapter,
  IDynamoDBConfig,
} from "../common/dynamoDBAdapter/dynamoDBAdapter";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { setupLogger } from "../common/logging/setupLogger";
import { ICredentialResultRegistry } from "./credentialResultRegistry/credentialResultRegistry";
import { PutItemCredentialResult } from "./credentialResultRegistry/putItemOperation/putItemCredentialResult";
import { validateCredentialResult } from "./validateCredentialResult/validateCredentialResult";
import { getDequeueCredentialResultConfig } from "./dequeueCredentialResultConfig";
import { getTimeToLiveInSeconds } from "../common/utils/utils";

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
      const { sub, sentTimestamp } = validateCredentialResultResponse.value;
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
          processedMessage: compositeKeyData,
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

export interface IDequeueCredentialResultDependencies {
  env: NodeJS.ProcessEnv;
  getCredentialResultRegistry: ({
    tableName,
    ttlInSeconds,
  }: IDynamoDBConfig) => ICredentialResultRegistry;
}

const dependencies: IDequeueCredentialResultDependencies = {
  env: process.env,
  getCredentialResultRegistry: ({ tableName, ttlInSeconds }: IDynamoDBConfig) =>
    new DynamoDBAdapter({ tableName, ttlInSeconds }),
};

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
