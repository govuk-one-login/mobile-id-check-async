import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { emptyFailure, emptySuccess, Result } from "../utils/result";
import { LogMessage } from "../logging/LogMessage";
import { logger } from "../logging/logger";
import { getTimeToLiveInSeconds } from "../utils/utils";

export interface IDequeueDynamoDbPutItemInput {
  pk: string;
  sk: string;
  body: string;
  ttlDurationInSeconds: string;
}

export interface IDequeueDynamoDbAdapter {
  putItem(
    putItemInput: IDequeueDynamoDbPutItemInput,
  ): Promise<Result<void, void>>;
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

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async putItem(
    putItemInput: IDequeueDynamoDbPutItemInput,
  ): Promise<Result<void, void>> {
    const { pk, sk, body, ttlDurationInSeconds } = putItemInput;
    const timeToLiveInSeconds = getTimeToLiveInSeconds(ttlDurationInSeconds);
    const putItemCommand = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall({
        pk,
        sk,
        body,
        timeToLiveInSeconds,
      }),
    });

    try {
      const logData = { pk, sk, timeToLiveInSeconds };
      logger.debug(LogMessage.DEQUEUE_PUT_ITEM_ATTEMPT, {
        putItemData: {
          tableName: this.tableName,
          ...logData,
        },
      });

      await this.dynamoDBClient.send(putItemCommand);
    } catch (error: unknown) {
      logger.error(LogMessage.DEQUEUE_PUT_ITEM_UNEXPECTED_FAILURE, {
        pk,
        sk,
        error,
      });
      return emptyFailure();
    }

    logger.debug(LogMessage.DEQUEUE_PUT_ITEM_SUCCESS);
    return emptySuccess();
  }
}
