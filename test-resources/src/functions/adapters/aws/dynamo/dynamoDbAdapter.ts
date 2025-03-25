import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  PutItemCommand,
  PutItemCommandInput,
} from "@aws-sdk/client-dynamodb";
import {
  SessionCreateFailed,
  SessionRegistry,
  UpdateSessionError,
} from "../../../common/session/SessionRegistry";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import {
  emptySuccess,
  errorResult,
  Result,
} from "../../../common/utils/result";
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
  ): Promise<Result<void, SessionCreateFailed>> {
    const input: PutItemCommandInput = {
      TableName: this.tableName,
      Item: marshall(sessionAttributes),
      ConditionExpression: "attribute_not_exists(sessionId)",
    };

    try {
      await this.dynamoDbClient.send(new PutItemCommand(input));
    } catch (error: unknown) {
      if (error instanceof ConditionalCheckFailedException) {
        logger.error(LogMessage.CREATE_SESSION_CONDITIONAL_CHECK_FAILURE, {
          error,
          sessionAttributes,
        });
        return errorResult({
          errorType: UpdateSessionError.CONDITIONAL_CHECK_FAILURE,
        });
      } else {
        logger.error(LogMessage.CREATE_SESSION_UNEXPECTED_FAILURE, {
          error,
          sessionAttributes,
        });
        return errorResult({
          errorType: UpdateSessionError.INTERNAL_SERVER_ERROR,
        });
      }
    }
    return emptySuccess();
  }
}
