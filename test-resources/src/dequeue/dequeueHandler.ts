import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
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
} from "aws-lambda";
import { Logger } from "../services/logging/logger";
import { getConfig } from "./getConfig";
import { allowedTxmaEventNames, getEvent } from "./getEvent";
import { MessageName, registeredLogs } from "./registeredLogs";

export const lambdaHandlerConstructor = async (
  dependencies: IDequeueDependencies,
  event: SQSEvent,
  context: Context,
): Promise<SQSBatchResponse> => {
  const logger = dependencies.logger();
  logger.addContext(context);
  logger.log("STARTED");

  const records = event.Records;
  const batchItemFailures: SQSBatchItemFailure[] = [];
  const processedMessages: IProcessedMessage[] = [];

  const getConfigResult = getConfig(dependencies.env);
  if (getConfigResult.isError) {
    const { errorMessage } = getConfigResult.value;

    logger.log("ENVIRONMENT_VARIABLE_MISSING", {
      errorMessage,
    });

    return { batchItemFailures };
  }
  const env = getConfigResult.value;

  for (const record of records) {
    const messageId = record.messageId;

    const getEventResult = getEvent(record);
    if (getEventResult.isError) {
      logger.log("FAILED_TO_PROCESS_MESSAGES", getEventResult.value);

      batchItemFailures.push({ itemIdentifier: messageId });
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
        eventBody: record.body,
        timeToLiveInSeconds,
      }),
    };

    const command = new PutItemCommand(putItemCommandInput);
    try {
      await dbClient.send(command);
    } catch (error) {
      logger.log("ERROR_WRITING_EVENT_TO_EVENTS_TABLE", {
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

  logger.log("PROCESSED_MESSAGES", { processedMessages });
  logger.log("COMPLETED");

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
  logger: () => Logger<MessageName>;
}

const dependencies: IDequeueDependencies = {
  env: process.env,
  logger: () =>
    new Logger<MessageName>(
      new PowertoolsLogger({ serviceName: "Dequeue Function" }),
      registeredLogs,
    ),
};

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
