import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { PutItemOperation } from "../../common/dynamoDBAdapter/putItemOperation";
import { emptySuccess, Result } from "../../common/utils/result";
import { LogMessage } from "../logging/LogMessage";
import { logger } from "../logging/logger";

export class DynamoDBAdapter {
  private readonly dynamoDBClient: DynamoDBClient;
  private readonly tableName: string;
  private readonly ttlInSeconds: number;

  constructor({ tableName, ttlInSeconds }: IDynamoDBConfig) {
    this.dynamoDBClient = new DynamoDBClient({
      region: process.env.REGION,
      maxAttempts: 2,
      requestHandler: new NodeHttpHandler({
        connectionTimeout: 5000,
        requestTimeout: 5000,
      }),
    });
    this.tableName = tableName;
    this.ttlInSeconds = ttlInSeconds;
  }

  async putItem(
    putItemOperation: PutItemOperation,
  ): Promise<Result<void, void>> {
    const { pk, sk } = putItemOperation.getDynamoDbPutItemCompositeKey();
    const putItemCommand = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall({
        pk,
        sk,
        timeToLiveInSeconds: this.ttlInSeconds,
      }),
    });

    try {
      logger.debug(LogMessage.DYNAMO_DB_ADAPTER_PUT_ITEM_ATTEMPT, {
        putItemData: {
          tableName: this.tableName,
          pk,
          sk,
          timeToLiveInSeconds: this.ttlInSeconds,
        },
      });

      await this.dynamoDBClient.send(putItemCommand);
    } catch (error) {
      return putItemOperation.handlePutItemError(error);
    }

    return emptySuccess();
  }
}

export interface IDynamoDBConfig {
  tableName: string;
  ttlInSeconds: number;
}
