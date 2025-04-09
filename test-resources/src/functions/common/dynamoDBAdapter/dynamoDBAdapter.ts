import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import {
  PutItemOperation,
  TestResourceItem,
} from "../../common/dynamoDBAdapter/putItemOperation";
import { emptySuccess, Result } from "../../common/utils/result";
import { LogMessage } from "../logging/LogMessage";
import { logger } from "../logging/logger";

export class DynamoDBAdapter {
  private readonly dynamoDbClient: DynamoDBClient;

  constructor(private readonly tableName: string) {
    this.dynamoDbClient = new DynamoDBClient({
      region: process.env.REGION,
      maxAttempts: 2,
      requestHandler: new NodeHttpHandler({
        connectionTimeout: 5000,
        requestTimeout: 5000,
      }),
    });
  }

  async putItem(
    item: TestResourceItem,
    putItemOperation: PutItemOperation,
  ): Promise<Result<void, void>> {
    const { pk, sk } = putItemOperation.getDynamoDbPutItemCompositeKey(item);
    const putItemCommand = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall({
        pk,
        sk,
        // timeToLiveInSeconds,
      }),
    });

    try {
      logger.debug(LogMessage.DYNAMO_DB_ADAPTER_PUT_ITEM_ATTEMPT, {
        putItemData: {
          tableName: this.tableName,
          pk,
          sk,
        },
      });

      await this.dynamoDbClient.send(putItemCommand);
    } catch (error) {
      return putItemOperation.handlePutItemError(error);
    }

    return emptySuccess();
  }
}
