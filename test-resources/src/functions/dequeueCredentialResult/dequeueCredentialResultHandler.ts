import {
  Context,
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
} from "aws-lambda";
import { DynamoDBAdapter } from "../common/dynamoDBAdapter/dynamoDBAdapter";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { setupLogger } from "../common/logging/setupLogger";
import { ICredentialResultRegistry } from "./credentialResultRegistry/credentialResultRegistry";
import { PutItemCredentialResult } from "./credentialResultRegistry/putItemOperation/putItemCredentialResult";
import { validateCredentialResult } from "./validateCredentialResult/validateCredentialResult";

export const lambdaHandlerConstructor = async (
  dependencies: IDequeueCredentialResultDependencies,
  event: SQSEvent,
  context: Context,
): Promise<SQSBatchResponse> => {
  setupLogger(context);
  logger.info(LogMessage.DEQUEUE_CREDENTIAL_RESULT_STARTED);
  const batchItemFailures: SQSBatchItemFailure[] = [];
  const credentialResultRegistry =
    dependencies.getCredentialResultRegistry("mock-table-name");

  for (const record of event.Records) {
    const validateCredentialResultResponse = validateCredentialResult(record);
    if (validateCredentialResultResponse.isError) {
      const { errorMessage } = validateCredentialResultResponse.value;
      logger.error(LogMessage.DEQUEUE_CREDENTIAL_RESULT_MESSAGE_INVALID, {
        errorMessage,
      });
    } else {
      const { sub, sentTimestamp } = validateCredentialResultResponse.value;
      const credentialResult = { sub, sentTimestamp };
      logger.info(
        LogMessage.DEQUEUE_CREDENTIAL_RESULT_PROCESS_MESSAGE_SUCCESS,
        {
          processedMessage: credentialResult,
        },
      );

      const putItemResult = await credentialResultRegistry.putItem(
        credentialResult,
        new PutItemCredentialResult(),
      );

      if (putItemResult.isError) {
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }
  }

  logger.info(LogMessage.DEQUEUE_CREDENTIAL_RESULT_COMPLETED);
  return { batchItemFailures };
};

export interface IDequeueCredentialResultDependencies {
  env: NodeJS.ProcessEnv;
  getCredentialResultRegistry: (tableName: string) => ICredentialResultRegistry;
}

const dependencies: IDequeueCredentialResultDependencies = {
  env: process.env,
  getCredentialResultRegistry: (tableName: string) =>
    new DynamoDBAdapter(tableName),
};

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
