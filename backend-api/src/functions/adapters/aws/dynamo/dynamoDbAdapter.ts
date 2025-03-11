import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  PutItemCommandInput,
  QueryCommand,
  QueryCommandInput,
  QueryCommandOutput,
  ReturnValue,
  ReturnValuesOnConditionCheckFailure,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import {
  NativeAttributeValue,
  marshall,
  unmarshall,
} from "@aws-sdk/util-dynamodb";
import { logger } from "../../../common/logging/logger";
import { LogMessage } from "../../../common/logging/LogMessage";
import { GetSessionOperation } from "../../../common/session/getOperations/GetSessionOperation";
import { SessionState } from "../../../common/session/session";
import {
  GetSessionError,
  SessionRegistry,
  SessionRetrievalFailed,
  SessionRetrievalFailedInternalServerError,
  SessionRetrievalFailedSessionNotFound,
  SessionUpdateFailed,
  SessionUpdateFailedInternalServerError,
  SessionUpdated,
  UpdateExpressionDataToLog,
  UpdateSessionError,
} from "../../../common/session/SessionRegistry";
import { UpdateSessionOperation } from "../../../common/session/updateOperations/UpdateSessionOperation";
import { CreateSessionAttributes } from "../../../services/session/sessionService";
import {
  FailureWithValue,
  Result,
  emptySuccess,
  errorResult,
  successResult,
} from "../../../utils/result";

export type DatabaseRecord = Record<string, NativeAttributeValue>;

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

  async getActiveSession(
    subjectIdentifier: string,
    attributesToGet: string[],
  ): Promise<DatabaseRecord | null> {
    const input: QueryCommandInput = {
      TableName: this.tableName,
      IndexName: "subjectIdentifier-timeToLive-index",
      KeyConditionExpression:
        "subjectIdentifier = :subjectIdentifier and :currentTimeInSeconds < timeToLive",
      FilterExpression: "sessionState = :sessionState",
      ExpressionAttributeValues: {
        ":subjectIdentifier": marshall(subjectIdentifier),
        ":sessionState": marshall(SessionState.AUTH_SESSION_CREATED),
        ":currentTimeInSeconds": marshall(this.getTimeNowInSeconds()),
      },
      ProjectionExpression: this.formatAsProjectionExpression(attributesToGet),
      Limit: 1,
      ScanIndexForward: false,
    };

    const queryCommandOutput: QueryCommandOutput =
      await this.dynamoDbClient.send(new QueryCommand(input));

    const items = queryCommandOutput.Items;
    if (!items || items.length === 0) {
      return null;
    }

    return unmarshall(items[0]);
  }

  private formatAsProjectionExpression(attributes: string[]): string {
    return attributes.join(", ");
  }

  async createSession(
    attributes: CreateSessionAttributes,
    sessionId: string,
  ): Promise<void> {
    const {
      client_id,
      govuk_signin_journey_id,
      issuer,
      redirect_uri,
      sessionDurationInSeconds,
      state,
      sub,
    } = attributes;
    const timeToLive = this.getTimeNowInSeconds() + sessionDurationInSeconds;

    const input: PutItemCommandInput = {
      TableName: this.tableName,
      Item: marshall({
        clientId: client_id,
        govukSigninJourneyId: govuk_signin_journey_id,
        createdAt: Date.now(),
        issuer: issuer,
        sessionId: sessionId,
        sessionState: SessionState.AUTH_SESSION_CREATED,
        clientState: state,
        subjectIdentifier: sub,
        timeToLive: timeToLive,
        ...(redirect_uri && { redirectUri: redirect_uri }),
      }),
      ConditionExpression: "attribute_not_exists(sessionId)",
    };

    try {
      await this.dynamoDbClient.send(new PutItemCommand(input));
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        throw new Error("Session already exists with this ID");
      } else {
        throw error;
      }
    }
  }

  async getSession(
    getOperation: GetSessionOperation,
  ): Promise<Result<void, SessionRetrievalFailed>> {
    let response;
    try {
      logger.debug(LogMessage.GET_SESSION_ATTEMPT);

      response = await this.dynamoDbClient.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: getOperation.getDynamoDbKeyExpression(),
        }),
      );
    } catch (error: unknown) {
      return this.handleGetSessionInternalServerError(error);
    }

    const responseItem = response.Item;
    if (responseItem == null) {
      logger.error(LogMessage.GET_SESSION_SESSION_NOT_FOUND);

      return errorResult({
        errorType: GetSessionError.SESSION_NOT_FOUND,
      });
    }

    const getSessionAttributesResult =
      getOperation.getSessionAttributesFromDynamoDbItem(responseItem);
    if (getSessionAttributesResult.isError) {
      return this.handleGetSessionNotFoundError(
        "Could not parse valid session attributes after successful get command",
      );
    }
    const sessionAttributes = getSessionAttributesResult.value;

    const { createdAt } = sessionAttributes;
    if (this.isOlderThan60minutes(createdAt)) {
      logger.error(LogMessage.GET_SESSION_SESSION_TOO_OLD);

      return errorResult({
        errorType: GetSessionError.SESSION_NOT_FOUND,
      });
    }

    logger.debug(LogMessage.GET_SESSION_SUCCESS);

    return emptySuccess();
  }

  async updateSession(
    sessionId: string,
    updateOperation: UpdateSessionOperation,
  ): Promise<Result<SessionUpdated, SessionUpdateFailed>> {
    const updateExpressionDataToLog = {
      updateExpression: updateOperation.getDynamoDbUpdateExpression(),
      conditionExpression: updateOperation.getDynamoDbConditionExpression(),
    };

    let response;
    try {
      logger.debug(LogMessage.UPDATE_SESSION_ATTEMPT, {
        data: updateExpressionDataToLog,
      });
      response = await this.dynamoDbClient.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            sessionId: { S: sessionId },
          },
          UpdateExpression: updateOperation.getDynamoDbUpdateExpression(),
          ConditionExpression: updateOperation.getDynamoDbConditionExpression(),
          ExpressionAttributeValues:
            updateOperation.getDynamoDbExpressionAttributeValues(),
          ReturnValues: ReturnValue.ALL_NEW,
          ReturnValuesOnConditionCheckFailure:
            ReturnValuesOnConditionCheckFailure.ALL_OLD,
        }),
      );
    } catch (error) {
      if (
        error instanceof ConditionalCheckFailedException &&
        error.Item == null
      ) {
        logger.error(LogMessage.UPDATE_SESSION_SESSION_NOT_FOUND, {
          error: error.message,
          data: updateExpressionDataToLog,
        });
        return errorResult({
          errorType: UpdateSessionError.SESSION_NOT_FOUND as const,
        });
      }
      if (error instanceof ConditionalCheckFailedException) {
        const getSessionAttributesOptions = {
          operationFailed: true,
        };
        const getAttributesResult =
          updateOperation.getSessionAttributesFromDynamoDbItem(
            error.Item,
            getSessionAttributesOptions,
          );
        if (getAttributesResult.isError) {
          return this.handleUpdateSessionInternalServerError(
            error,
            updateExpressionDataToLog,
          );
        }

        logger.error(LogMessage.UPDATE_SESSION_CONDITIONAL_CHECK_FAILURE, {
          error: error.message,
          data: updateExpressionDataToLog,
        });
        return errorResult({
          errorType: UpdateSessionError.CONDITIONAL_CHECK_FAILURE,
          attributes: getAttributesResult.value,
        });
      } else {
        return this.handleUpdateSessionInternalServerError(
          error,
          updateExpressionDataToLog,
        );
      }
    }

    const getAttributesResult =
      updateOperation.getSessionAttributesFromDynamoDbItem(response.Attributes);

    if (getAttributesResult.isError) {
      return this.handleUpdateSessionInternalServerError(
        "Could not parse valid session attributes after successful update command",
        updateExpressionDataToLog,
      );
    }

    logger.debug(LogMessage.UPDATE_SESSION_SUCCESS);
    return successResult({ attributes: getAttributesResult.value });
  }

  private getTimeNowInSeconds() {
    return Math.floor(Date.now() / 1000);
  }

  private getTimeNowInMilliseconds() {
    return Math.floor(Date.now());
  }

  private isOlderThan60minutes(createdAtInMilliseconds: number) {
    const SIXTY_MINUTES_IN_MILLISECONDS = 3600000;
    const validFrom =
      this.getTimeNowInMilliseconds() - SIXTY_MINUTES_IN_MILLISECONDS;

    return createdAtInMilliseconds < validFrom;
  }

  private handleUpdateSessionInternalServerError(
    error: unknown,
    updateExpressionDataToLog: UpdateExpressionDataToLog,
  ): FailureWithValue<SessionUpdateFailedInternalServerError> {
    logger.error(LogMessage.UPDATE_SESSION_UNEXPECTED_FAILURE, {
      error: error,
      data: updateExpressionDataToLog,
    });
    return errorResult({
      errorType: UpdateSessionError.INTERNAL_SERVER_ERROR,
    });
  }

  private handleGetSessionInternalServerError(
    error: unknown,
  ): FailureWithValue<SessionRetrievalFailedInternalServerError> {
    logger.error(LogMessage.GET_SESSION_UNEXPECTED_FAILURE, {
      data: { error },
    });
    return errorResult({
      errorType: GetSessionError.INTERNAL_SERVER_ERROR,
    });
  }

  private handleGetSessionNotFoundError(
    error: unknown,
  ): FailureWithValue<SessionRetrievalFailedSessionNotFound> {
    logger.error(LogMessage.GET_SESSION_SESSION_NOT_FOUND, {
      data: { error },
    });
    return errorResult({
      errorType: GetSessionError.SESSION_NOT_FOUND,
    });
  }
}
