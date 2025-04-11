import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { PutItemOperation } from "./putItemOperation";
import { emptyFailure, emptySuccess, Result } from "../utils/result";
import { LogMessage } from "../logging/LogMessage";
import { logger } from "../logging/logger";

export class DynamoDbAdapter implements IDynamoDbAdapter {
  private readonly dynamoDBClient: DynamoDBClient;
  private readonly tableName: string;

  constructor({ tableName }: IDynamoDBConfig) {
    this.dynamoDBClient = new DynamoDBClient({
      region: process.env.REGION,
      maxAttempts: 2,
      requestHandler: new NodeHttpHandler({
        connectionTimeout: 5000,
        requestTimeout: 5000,
      }),
    });
    this.tableName = tableName;
  }

  async putItem(
    putItemOperation: PutItemOperation,
  ): Promise<Result<void, void>> {
    const putItemCommand = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall({
        ...putItemOperation.getDynamoDbPutItemCommandInput(),
      }),
    });

    try {
      const { pk, sk, timeToLiveInSeconds } =
        putItemOperation.getDynamoDbPutItemCommandInput();
      const logData = { pk, sk, timeToLiveInSeconds };
      logger.debug(LogMessage.PUT_ITEM_ATTEMPT, {
        putItemData: {
          tableName: this.tableName,
          ...logData,
        },
      });

      await this.dynamoDBClient.send(putItemCommand);
    } catch (error) {
      logger.error(LogMessage.PUT_ITEM_UNEXPECTED_FAILURE, {
        error,
      });
      return emptyFailure();
    }

    return emptySuccess();
  }
}

export interface IDynamoDbAdapter {
  putItem(putItemOperation: PutItemOperation): Promise<Result<void, void>>;
}

export interface IDynamoDBConfig {
  tableName: string;
}
