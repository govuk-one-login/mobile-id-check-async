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
import { EmptySuccess } from "../common/utils/result";
import { mockDynamoDBAdapterSuccess } from "./dequeueCredentialResultHandler.test";

export const lambdaHandlerConstructor = async (
  dependencies: IDequeueCredentialResultDependencies,
  event: SQSEvent,
  context: Context,
): Promise<SQSBatchResponse> => {
  setupLogger(context);
  logger.info(LogMessage.DEQUEUE_CREDENTIAL_RESULT_STARTED);
  const batchItemFailures: SQSBatchItemFailure[] = [];
  const dynamoDBAdapter = dependencies.getDynamoDBAdapter("mock-table-name");

  for (const record of event.Records) {
    const validateCredentialResultResponse = validateCredentialResult(record);
    if (validateCredentialResultResponse.isError) {
      const { errorMessage } = validateCredentialResultResponse.value;
      logger.error(LogMessage.DEQUEUE_CREDENTIAL_RESULT_MESSAGE_INVALID, {
        errorMessage,
      });
    } else {
      const { sub, sentTimestamp } = validateCredentialResultResponse.value;
      const processedMessage = { sub, sentTimestamp };
      logger.info(
        LogMessage.DEQUEUE_CREDENTIAL_RESULT_PROCESS_MESSAGE_SUCCESS,
        {
          processedMessage,
        },
      );

      const putItemResult = dynamoDBAdapter.putItem();
      if (putItemResult.isError) {
        // handle error function
        console.log("DyanmoDB putItem error");
      }
    }
  }

  logger.info(LogMessage.DEQUEUE_CREDENTIAL_RESULT_COMPLETED);
  return { batchItemFailures };
};

export interface IDynamoDBAdapter {
  putItem: () => EmptySuccess;
}

export interface IDequeueCredentialResultDependencies {
  env: NodeJS.ProcessEnv;
  getDynamoDBAdapter: (tableName: string) => IDynamoDBAdapter;
}

export interface IProcessedMessage {
  sub: string;
  sentTimestamp: string;
}

const dependencies: IDequeueCredentialResultDependencies = {
  env: process.env,
  getDynamoDBAdapter: (_tableName: string) => mockDynamoDBAdapterSuccess,
};

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
