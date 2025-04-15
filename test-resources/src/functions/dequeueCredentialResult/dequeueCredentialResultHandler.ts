import {
  Context,
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
} from "aws-lambda";
import { IDequeueDynamoDbPutItemInput } from "../common/dequeueDynamoDbAdapter/dequeueDynamoDbAdapter";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { setupLogger } from "../common/logging/setupLogger";
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
    const validateCredentialResultResponse = validateCredentialResult(
      record.body,
    );
    if (validateCredentialResultResponse.isError) {
      const { errorMessage } = validateCredentialResultResponse.value;
      logger.error(LogMessage.DEQUEUE_CREDENTIAL_RESULT_MESSAGE_INVALID, {
        errorMessage,
      });
    } else {
      const credentialResultRegistry = dependencies.getCredentialResultRegistry(
        config.CREDENTIAL_RESULT_TABLE_NAME,
      );
      const { sub, credentialResultBody } =
        validateCredentialResultResponse.value;
      const sentTimestamp = record.attributes.SentTimestamp;
      const putItemInput = getPutItemInput({
        sub,
        sentTimestamp,
        credentialResultBody,
        ttlDurationInSeconds: config.CREDENTIAL_RESULT_TTL_DURATION_IN_SECONDS,
      });
      const putItemResult = await credentialResultRegistry.putItem({
        ...putItemInput,
      });
      if (putItemResult.isError) {
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }

      logger.info(
        LogMessage.DEQUEUE_CREDENTIAL_RESULT_PROCESS_MESSAGE_SUCCESS,
        {
          processedMessage: { sub, sentTimestamp },
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

interface IDequeueDynamoDbPutItemData {
  sub: string;
  sentTimestamp: string;
  credentialResultBody: object;
  ttlDurationInSeconds: string;
}

function getPutItemInput({
  sub,
  sentTimestamp,
  credentialResultBody,
  ttlDurationInSeconds,
}: IDequeueDynamoDbPutItemData): IDequeueDynamoDbPutItemInput {
  return {
    pk: `SUB#${sub}`,
    sk: `SENT_TIMESTAMP#${sentTimestamp}`,
    body: JSON.stringify(credentialResultBody),
    ttlDurationInSeconds,
  };
}
