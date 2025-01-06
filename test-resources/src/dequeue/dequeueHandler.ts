import { BatchWriteItemCommand, PutRequest } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { SQSEvent } from "aws-lambda";
import { DynamoDbAdapter } from "../../adapters/dynamoDbAdapter";
import { TxmaEvent } from "./txma/TxmaEventTypes";

export const lambdaHandler = async (event: SQSEvent): Promise<void> => {
  console.log("STARTED");

  const records = event.Records;
  const tableName = "jh-test-resources-dequeue-table";
  const input: IDynamoDBBatchWriteItemInput = {
    RequestItems: {
      [tableName]: [],
    },
  };

  for (const record of records) {
    const txmaEvent: TxmaEvent = JSON.parse(record.body);

    const putRequest: IPutRequest = {
      PutRequest: {
        Item: marshall({
          pk: `TXMA#SESSION_ID#${txmaEvent.user.session_id}`,
          sk: `EVENT_NAME#${txmaEvent.event_name}#EVENT_TIMESTAMP#${txmaEvent.timestamp}`,
          eventBody: JSON.stringify(txmaEvent),
        }),
      },
    };

    input.RequestItems[tableName].push(putRequest);
  }

  console.log(input.RequestItems[tableName]);

  const command = new BatchWriteItemCommand(input);

  try {
    await new DynamoDbAdapter().send(command);
  } catch (error) {
    console.log(`Error writing to DynamoDB: ${error}`);
  }

  console.log("COMPLETED");
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
