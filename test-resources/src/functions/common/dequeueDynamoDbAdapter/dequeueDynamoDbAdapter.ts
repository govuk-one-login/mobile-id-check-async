import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { emptyFailure, emptySuccess, Result } from "../utils/result";
import { LogMessage } from "../logging/LogMessage";
import { logger } from "../logging/logger";

export interface IDequeueDynamoDbAdapter {
  putItem(
    putItemInput: DequeueDynamoDbPutItemInput,
  ): Promise<Result<void, void>>;
}

export interface IDynamoDBConfig {
  tableName: string;
}

export interface DequeueDynamoDbPutItemInput {
  pk: string;
  sk: string;
  event: string;
  timeToLiveInSeconds: number;
}

export class DequeueDynamoDbAdapter implements IDequeueDynamoDbAdapter {
  private readonly tableName: string;
  private readonly dynamoDBClient: DynamoDBClient = new DynamoDBClient({
    region: process.env.REGION,
    maxAttempts: 2,
    requestHandler: new NodeHttpHandler({
      connectionTimeout: 5000,
      requestTimeout: 5000,
    }),
  });

  constructor({ tableName }: IDynamoDBConfig) {
    this.tableName = tableName;
  }

  async putItem(
    putItemInput: DequeueDynamoDbPutItemInput,
  ): Promise<Result<void, void>> {
    const putItemCommand = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall(putItemInput),
    });

    try {
      const { pk, sk, timeToLiveInSeconds } = putItemInput;
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

    logger.debug(LogMessage.PUT_ITEM_SUCCESS);
    return emptySuccess();
  }
}
