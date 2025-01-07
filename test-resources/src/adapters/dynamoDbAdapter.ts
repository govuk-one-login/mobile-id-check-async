import {
  BatchWriteItemCommand,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import { NodeHttpHandler } from "@smithy/node-http-handler";

export class DynamoDBAdapter implements IDynamoDBAdapter {
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

  async send(command: DynamoDBCommand): Promise<any> {
    try {
      await this.ddbClient.send(command);
      return Promise.resolve(null);
    } catch (error) {
      return Promise.resolve(`Error writing to DynamoDB: ${error}`);
    }
  }
}

export type DynamoDBCommand = BatchWriteItemCommand;

export interface IDynamoDBAdapter {
  send: (command: DynamoDBCommand) => Promise<any>;
}
