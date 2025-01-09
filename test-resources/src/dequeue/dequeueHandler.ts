import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import {
  BatchWriteItemCommand,
  DynamoDBClient,
  PutRequest,
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
import { MessageName, registeredLogs } from "./registeredLogs";
import { TxmaEvent } from "./txma/TxmaEventTypes";

export const lambdaHandlerConstructor = async (
  dependencies: IDequeueDependencies,
  event: SQSEvent,
  context: Context,
): Promise<SQSBatchResponse> => {
  const { env } = dependencies;
  const logger = dependencies.logger();
  logger.addContext(context);
  logger.log("STARTED");

  const records = event.Records;
  const batchItemFailures: SQSBatchItemFailure[] = [];
  if (!env.DEQUEUE_TABLE_NAME) {
    logger.log("ENVIRONMENT_VARIABLE_MISSING", {
      errorMessage: "Missing environment variable: DEQUEUE_TABLE_NAME",
    });
    return { batchItemFailures };
  }
  if (!env.TXMA_EVENT_TTL_DURATION_IN_SECONDS) {
    logger.log("ENVIRONMENT_VARIABLE_MISSING", {
      errorMessage:
        "Missing environment variable: TXMA_EVENT_TTL_DURATION_IN_SECONDS",
    });
    return { batchItemFailures };
  }

  const tableName = env.DEQUEUE_TABLE_NAME;
  const input: IDynamoDBBatchWriteItemInput = {
    RequestItems: {
      [tableName]: [],
    },
  };

  for (const record of records) {
    let txmaEvent: TxmaEvent;

    try {
      txmaEvent = JSON.parse(record.body);
    } catch {
      logger.log("FAILED_TO_PROCESS_MESSAGES", {
        errorMessage: `Failed to process message - messageId: ${record.messageId}`,
      });

      batchItemFailures.push({ itemIdentifier: record.messageId });
      continue;
    }

    const timeToLiveInSeconds = getTimeToLiveInSeconds(
      env.TXMA_EVENT_TTL_DURATION_IN_SECONDS,
    );
    const putRequest: IPutRequest = {
      PutRequest: {
        Item: marshall({
          pk: `TXMA#${txmaEvent.user.session_id}`,
          sk: `${txmaEvent.event_name}#${txmaEvent.timestamp}`,
          eventBody: record.body,
          timeToLiveInSeconds,
        }),
      },
    };

    input.RequestItems[tableName].push(putRequest);
  }

  logger.log("PROCESSED_MESSAGES", { messages: input.RequestItems[tableName] });

  const command = new BatchWriteItemCommand(input);
  try {
    await dbClient.send(command);
  } catch (error) {
    logger.log("ERROR_WRITING_EVENT_TO_DEQUEUE_TABLE", {
      errorMessage: error,
    });
  }

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

interface IDynamoDBBatchWriteItemInput {
  RequestItems: IRequestItems;
}

interface IRequestItems {
  [tableName: string]: IPutRequest[];
}

interface IPutRequest {
  PutRequest: PutRequest;
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
