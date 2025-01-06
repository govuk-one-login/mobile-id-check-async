import {
  BatchWriteItemCommand,
  DynamoDBClient,
  PutRequest,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { SQSEvent } from "aws-lambda";
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

  const command = new BatchWriteItemCommand(input);

  try {
    await ddbClient.send(command);
  } catch (error) {
    console.log(`Error writing to DynamoDB: ${error}`);
  }

  console.log("COMPLETED");
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
