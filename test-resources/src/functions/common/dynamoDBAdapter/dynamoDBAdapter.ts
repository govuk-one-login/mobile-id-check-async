import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { PutItemOperation } from "../../common/dynamoDBAdapter/putItemOperation";
import { emptyFailure, emptySuccess, Result } from "../../common/utils/result";
import { LogMessage } from "../logging/LogMessage";
import { logger } from "../logging/logger";

export class DynamoDbAdapter implements IDynamoDbAdapter {
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
    const putItemCommandData = {
      ...putItemOperation.getDynamoDbPutItemCompositeKey(),
      timeToLiveInSeconds: this.ttlInSeconds,
    };
    const event = putItemOperation.getDynamoDbPutItemEventPayload();
    const putItemCommand = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall({
        ...putItemCommandData,
        event,
      }),
    });

    try {
      logger.debug(LogMessage.DYNAMO_DB_ADAPTER_PUT_ITEM_ATTEMPT, {
        putItemData: {
          tableName: this.tableName,
          ...putItemCommandData,
        },
      });

      await this.dynamoDBClient.send(putItemCommand);
    } catch (error) {
      logger.error(LogMessage.DYNAMO_DB_ADAPTER_SEND_ITEM_COMMAND_FAILURE, {
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
  ttlInSeconds: number;
}
