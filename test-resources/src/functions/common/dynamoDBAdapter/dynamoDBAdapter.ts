import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { PutItemOperation } from "../../common/dynamoDBAdapter/putItemOperation";
import { emptySuccess, Result } from "../../common/utils/result";
import { ICredentialResult } from "../../dequeueCredentialResult/credentialResult";
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
    item: ICredentialResult,
    putItemOperation: PutItemOperation,
  ): Promise<Result<void, void>> {
    const { pk, sk } = putItemOperation.getDynamoDbPutItemCompositeKey({
      sub: item.sub,
      sentTimestamp: item.sentTimestamp,
    });
    const { timeToLiveInSeconds } = item;
    const putItemCommand = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall({
        pk,
        sk,
        timeToLiveInSeconds,
      }),
    });

    try {
      logger.debug(LogMessage.DYNAMO_DB_ADAPTER_PUT_ITEM_ATTEMPT, {
        putItemData: {
          tableName: this.tableName,
          pk,
          sk,
          timeToLiveInSeconds,
        },
      });

      await this.dynamoDbClient.send(putItemCommand);
    } catch (error) {
      return putItemOperation.handlePutItemError(error);
    }

    return emptySuccess();
  }
}
