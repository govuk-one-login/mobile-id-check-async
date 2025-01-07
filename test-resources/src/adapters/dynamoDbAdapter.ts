import {
  BatchWriteItemCommand,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import { NodeHttpHandler } from "@smithy/node-http-handler";

export class DynamoDbAdapter {
  private readonly ddbClient: DynamoDBClient;

  constructor() {
    this.ddbClient = new DynamoDBClient({
      region: "eu-west-2",
      maxAttempts: 2,
      requestHandler: new NodeHttpHandler({
        connectionTimeout: 5000,
        requestTimeout: 5000,
      }),
    });
  }

  async send(command: DynamoDbCommand): Promise<any> {
    try {
      await this.ddbClient.send(command);
    } catch (error) {
      return Promise.resolve(`Error writing to DynamoDB: ${error}`);
    }
  }
}

type DynamoDbCommand = BatchWriteItemCommand;

export const ddbAdapter = new DynamoDbAdapter();
