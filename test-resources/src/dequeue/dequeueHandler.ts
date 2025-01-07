import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import {
  BatchWriteItemCommand,
  DynamoDBClient,
  PutRequest,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { SQSBatchItemFailure, SQSBatchResponse, SQSEvent } from "aws-lambda";
import { Logger } from "../services/logging/logger";
import { MessageName, registeredLogs } from "./registeredLogs";
import { TxmaEvent } from "./txma/TxmaEventTypes";

export const lambdaHandlerConstructor = async (
  dependencies: IDequeueDependencies,
  event: SQSEvent,
): Promise<SQSBatchResponse> => {
  const logger = dependencies.logger();
  logger.log("STARTED");

  const records = event.Records;
  const tableName = "jh-test-resources-dequeue-table";
  const batchItemFailures: SQSBatchItemFailure[] = [];
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

    const putRequest: IPutRequest = {
      PutRequest: {
        Item: marshall({
          pk: `TXMA#${txmaEvent.user.session_id}`,
          sk: `${txmaEvent.event_name}#${txmaEvent.timestamp}`,
          eventBody: JSON.stringify(txmaEvent),
        }),
      },
    };

    input.RequestItems[tableName].push(putRequest);
  }

  logger.log("PROCESSED_MESSAGES", { messages: input.RequestItems[tableName] });

  const command = new BatchWriteItemCommand(input);
  try {
    await ddbClient.send(command);
  } catch (error) {
    logger.log("ERROR_WRITING_EVENT_TO_DEQUEUE_TABLE", {
      errorMessage: error,
    });
  }

  logger.log("COMPLETED");

  return { batchItemFailures };
};

const ddbClient = new DynamoDBClient({
  region: "eu-west-2",
  maxAttempts: 2,
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 5000,
    requestTimeout: 5000,
  }),
});

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
  logger: () => Logger<MessageName>;
}

const dependencies: IDequeueDependencies = {
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
};

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
