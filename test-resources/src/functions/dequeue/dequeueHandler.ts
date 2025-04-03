import {
  DynamoDBClient,
  PutItemCommand,
  PutItemCommandInput,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { NodeHttpHandler } from "@smithy/node-http-handler";
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
import { Result } from "../common/utils/result";
import { getConfig } from "./getConfig";
import { allowedTxmaEventNames, getEvent, TxmaEvent } from "./getEvent";

export const lambdaHandlerConstructor = async (
  dependencies: IDequeueDependencies,
  event: SQSEvent,
  context: Context,
): Promise<SQSBatchResponse> => {
  setupLogger(context);
  logger.info(LogMessage.DEQUEUE_EVENTS_STARTED);
  const { getEvent } = dependencies;

  const records = event.Records;
  const batchItemFailures: SQSBatchItemFailure[] = [];
  const processedMessages: IProcessedMessage[] = [];

  const getConfigResult = getConfig(dependencies.env);
  if (getConfigResult.isError) {
    const { errorMessage } = getConfigResult.value;

    logger.error(LogMessage.DEQUEUE_EVENTS_INVALID_CONFIG, {
      errorMessage,
    });

    return { batchItemFailures };
  }
  const env = getConfigResult.value;

  for (const record of records) {
    const messageId = record.messageId;

    const getEventResult = getEvent(record);
    if (getEventResult.isError) {
      logger.error(
        LogMessage.DEQUEUE_EVENTS_FAILURE_PROCESSING_MESSAGE,
        getEventResult.value,
      );
      continue;
    }
    const eventName = getEventResult.value.event_name;
    const sessionId = getEventResult.value.user.session_id;
    const { timestamp } = getEventResult.value;

    const timeToLiveInSeconds = getTimeToLiveInSeconds(
      env.TXMA_EVENT_TTL_DURATION_IN_SECONDS,
    );
    const putItemCommandInput: PutItemCommandInput = {
      TableName: env.EVENTS_TABLE_NAME,
      Item: marshall({
        pk: `SESSION#${sessionId}`,
        sk: `TXMA#EVENT_NAME#${eventName}#TIMESTAMP#${timestamp}`,
        event: record.body,
        timeToLiveInSeconds,
      }),
    };

    const command = new PutItemCommand(putItemCommandInput);
    try {
      await dbClient.send(command);
    } catch (error) {
      logger.error(LogMessage.DEQUEUE_EVENTS_FAILURE_WRITING_TO_DATABASE, {
        eventName,
        sessionId,
        error,
      });

      batchItemFailures.push({ itemIdentifier: messageId });
      continue;
    }

    processedMessages.push({
      eventName,
      sessionId,
    });
  }

  logger.info(LogMessage.DEQUEUE_EVENTS_PROCESSED_MESSAGES, {
    processedMessages,
  });
  logger.info(LogMessage.DEQUEUE_EVENTS_COMPLETED);

  return { batchItemFailures };
};

const dbClient = new DynamoDBClient({
  region: "eu-west-2",
  maxAttempts: 3,
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 5000,
    requestTimeout: 5000,
  }),
});

function getTimeToLiveInSeconds(ttlDuration: string) {
  return Math.floor(Date.now() / 1000) + Number(ttlDuration);
}

interface IProcessedMessage {
  eventName: (typeof allowedTxmaEventNames)[number];
  sessionId: string;
}

export interface IDequeueDependencies {
  env: NodeJS.ProcessEnv;
  getEvent: (record: SQSRecord) => Result<TxmaEvent>;
}

const dependencies: IDequeueDependencies = {
  env: process.env,
  getEvent,
};

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
