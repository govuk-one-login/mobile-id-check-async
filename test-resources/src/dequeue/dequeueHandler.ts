import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { BatchWriteItemCommand, PutRequest } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { SQSBatchItemFailure, SQSBatchResponse, SQSEvent } from "aws-lambda";
import { DynamoDBAdapter, IDynamoDBAdapter } from "../adapters/dynamoDBAdapter";
import { Logger } from "../services/logging/logger";
import { MessageName, registeredLogs } from "./registeredLogs";
import { TxmaEvent } from "./txma/TxmaEventTypes";

export const lambdaHandlerConstructor = async (
  dependencies: IDequeueDependencies,
  event: SQSEvent,
): Promise<SQSBatchResponse> => {
  const dbAdapter = dependencies.dbAdapter();
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
  const dbResponse = await dbAdapter.send(command);
  if (dbResponse) {
    logger.log("ERROR_WRITING_EVENT_TO_DEQUEUE_TABLE", {
      errorMessage: dbResponse,
    });
  }

  logger.log("COMPLETED");

  return { batchItemFailures };
};

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
  dbAdapter: () => IDynamoDBAdapter;
}

const dependencies: IDequeueDependencies = {
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  dbAdapter: () => new DynamoDBAdapter(),
};

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
