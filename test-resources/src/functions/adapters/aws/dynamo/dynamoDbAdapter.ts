import {
  DynamoDBClient,
  PutItemCommand,
  PutItemCommandInput,
} from "@aws-sdk/client-dynamodb";
import { SessionRegistry } from "../../../common/session/SessionRegistry";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { emptySuccess, Result } from "../../../common/utils/result";
import { marshall } from "@aws-sdk/util-dynamodb";
import { logger } from "../../../common/logging/logger";
import { LogMessage } from "../../../common/logging/LogMessage";
import { SessionAttributes } from "../../../common/session/session";

export class DynamoDbAdapter implements SessionRegistry {
  private readonly tableName: string;
  private readonly dynamoDbClient = new DynamoDBClient({
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

  async createSession(
    sessionAttributes: SessionAttributes,
  ): Promise<Result<void, void>> {
    const input: PutItemCommandInput = {
      TableName: this.tableName,
      Item: marshall(sessionAttributes),
      ConditionExpression: "attribute_not_exists(sessionId)",
    };

    try {
      await this.dynamoDbClient.send(new PutItemCommand(input));
    } catch (error: unknown) {
      logger.error(LogMessage.TEST_SESSIONS_CREATE_SESSION_FAILURE, {
        error,
        sessionAttributes,
      });
    }
    return emptySuccess();
  }
}
