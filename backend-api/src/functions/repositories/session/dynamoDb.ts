import { NodeHttpHandler } from "@smithy/node-http-handler";
import {
  DynamoDBClient,
  PutItemCommand,
  PutItemCommandInput,
  PutItemCommandOutput,
  QueryCommand,
  QueryCommandInput,
  QueryCommandOutput,
} from "@aws-sdk/client-dynamodb";

export class DynamoDb implements IDynamoDbService {
  private readonly dynamoDbClient = new DynamoDBClient({
    region: process.env.REGION,
    maxAttempts: 2,
    requestHandler: new NodeHttpHandler({
      connectionTimeout: 29000,
      requestTimeout: 29000,
    }),
  });

  async putItem(input: PutItemCommandInput): Promise<PutItemCommandOutput> {
    return await this.dynamoDbClient.send(new PutItemCommand(input));
  }

  async query(item: QueryCommandInput): Promise<QueryCommandOutput> {
    return await this.dynamoDbClient.send(new QueryCommand(item));
  }
}

export interface IDynamoDbService {
  putItem: (item: PutItemCommandInput) => Promise<PutItemCommandOutput>;

  query: (item: QueryCommandInput) => Promise<QueryCommandOutput>;
}
