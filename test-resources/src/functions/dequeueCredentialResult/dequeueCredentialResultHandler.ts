import {
  Context,
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
  SQSRecord,
} from "aws-lambda";
import {
  IDequeueDynamoDbAdapter,
  IDequeueDynamoDbPutItemInput,
} from "../common/dequeueDynamoDbAdapter/dequeueDynamoDbAdapter";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { setupLogger } from "../common/logging/setupLogger";
import { emptySuccess, errorResult, Result } from "../common/utils/result";
import { getDequeueCredentialResultConfig } from "./dequeueCredentialResultConfig";
import {
  handlerDependencies,
  IDequeueCredentialResultDependencies,
} from "./handlerDependencies";
import { validateCredentialResult } from "./validateCredentialResult/validateCredentialResult";

export const lambdaHandlerConstructor = async (
  dependencies: IDequeueCredentialResultDependencies,
  event: SQSEvent,
  context: Context,
): Promise<SQSBatchResponse> => {
  setupLogger(context);
  logger.info(LogMessage.DEQUEUE_CREDENTIAL_RESULT_STARTED);
  const { getCredentialResultRegistry } = dependencies;
  const batchItemFailures: SQSBatchItemFailure[] = [];

  const configResult = getDequeueCredentialResultConfig(dependencies.env);
  if (configResult.isError) {
    return { batchItemFailures };
  }

  const config = configResult.value;
  const credentialResultRegistry = getCredentialResultRegistry(
    config.CREDENTIAL_RESULT_TABLE_NAME,
  );

  for (const record of event.Records) {
    const handleCredentialResultResponse = await handleCredentialResult({
      credentialResultRegistry,
      record,
      ttlDurationInSeconds: config.CREDENTIAL_RESULT_TTL_DURATION_IN_SECONDS,
    });

    if (handleCredentialResultResponse.isError) {
      if (handleCredentialResultResponse.value.isRetryable) {
        const { messageId } = handleCredentialResultResponse.value;
        if (messageId) batchItemFailures.push({ itemIdentifier: messageId });
      }
    }
  }

  logger.info(LogMessage.DEQUEUE_CREDENTIAL_RESULT_COMPLETED, {
    batchItemFailures,
  });
  return { batchItemFailures };
};

export const lambdaHandler = lambdaHandlerConstructor.bind(
  null,
  handlerDependencies,
);

interface HandleCredentialResultFailure {
  isRetryable: boolean;
  messageId?: string;
}

async function handleCredentialResult({
  credentialResultRegistry,
  record,
  ttlDurationInSeconds,
}: {
  credentialResultRegistry: IDequeueDynamoDbAdapter;
  record: SQSRecord;
  ttlDurationInSeconds: string;
}): Promise<Result<void, HandleCredentialResultFailure>> {
  const validateCredentialResultResponse = validateCredentialResult(
    record.body,
  );
  if (validateCredentialResultResponse.isError) {
    const { errorMessage } = validateCredentialResultResponse.value;
    logger.error(LogMessage.DEQUEUE_CREDENTIAL_RESULT_MESSAGE_INVALID, {
      errorMessage,
    });

    return errorResult({ isRetryable: false });
  }

  const { sub, credentialResult } = validateCredentialResultResponse.value;
  const sentTimestamp = record.attributes.SentTimestamp;
  const putItemInput = getPutItemInput({
    sub,
    sentTimestamp,
    credentialResult,
    ttlDurationInSeconds,
  });
  const putItemResult = await credentialResultRegistry.putItem(putItemInput);
  if (putItemResult.isError) {
    return errorResult({ isRetryable: true, messageId: record.messageId });
  }

  logger.info(LogMessage.DEQUEUE_CREDENTIAL_RESULT_DEQUEUE_MESSAGE_SUCCESS, {
    processedMessage: { sub, sentTimestamp },
  });

  return emptySuccess();
}

interface IDequeueDynamoDbPutItemData {
  sub: string;
  sentTimestamp: string;
  credentialResult: string;
  ttlDurationInSeconds: string;
}

function getPutItemInput({
  sub,
  sentTimestamp,
  credentialResult,
  ttlDurationInSeconds,
}: IDequeueDynamoDbPutItemData): IDequeueDynamoDbPutItemInput {
  return {
    pk: `SUB#${sub}`,
    sk: `SENT_TIMESTAMP#${sentTimestamp}`,
    body: JSON.stringify(credentialResult),
    ttlDurationInSeconds,
  };
}
