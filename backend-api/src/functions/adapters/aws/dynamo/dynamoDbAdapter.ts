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
import { NodeHttpHandler } from "@smithy/node-http-handler";
import {
  NativeAttributeValue,
  marshall,
  unmarshall,
} from "@aws-sdk/util-dynamodb";
import { logger } from "../../../common/logging/logger";
import { LogMessage } from "../../../common/logging/LogMessage";
import { GetSessionOperation } from "../../../common/session/getOperations/GetSessionOperation";
import {
  SessionAttributes,
  SessionState,
} from "../../../common/session/session";
import {
  GetSessionError,
  GetSessionErrorSessionNotFound,
  GetSessionFailed,
  GetSessionInternalServerError,
  GetSessionSessionInvalidErrorData,
  GetSessionValidateSessionErrorData,
  InvalidSessionAttributeTypes,
  SessionRegistry,
  SessionUpdateFailed,
  SessionUpdateFailedInternalServerError,
  SessionUpdated,
  UpdateOperationDataToLog,
  UpdateSessionError,
} from "../../../common/session/SessionRegistry";
import { UpdateSessionOperation } from "../../../common/session/updateOperations/UpdateSessionOperation";
import { CreateSessionAttributes } from "../../../services/session/sessionService";
import {
  FailureWithValue,
  Result,
  errorResult,
  successResult,
} from "../../../utils/result";
import { oneHourAgoInMilliseconds } from "../../../utils/utils";

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
      IndexName: "subjectIdentifier-createdAt-index",
      KeyConditionExpression:
        "subjectIdentifier = :subjectIdentifier AND createdAt > :oneHourAgoInMilliseconds",
      FilterExpression: "sessionState = :authSessionCreated",
      ExpressionAttributeValues: {
        ":subjectIdentifier": marshall(subjectIdentifier),
        ":authSessionCreated": marshall(SessionState.AUTH_SESSION_CREATED),
        ":oneHourAgoInMilliseconds": marshall(oneHourAgoInMilliseconds()),
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
    const nowInMilliseconds = Date.now();
    const timeToLive = this.getTimeToLive(
      nowInMilliseconds,
      sessionDurationInSeconds,
    );

    const input: PutItemCommandInput = {
      TableName: this.tableName,
      Item: marshall({
        clientId: client_id,
        govukSigninJourneyId: govuk_signin_journey_id,
        createdAt: nowInMilliseconds,
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

  private getTimeToLive(
    nowInMilliseconds: number,
    sessionDurationInSeconds: number,
  ) {
    return Math.floor(nowInMilliseconds / 1000) + sessionDurationInSeconds;
  }

  async getSession(
    sessionId: string,
    getOperation: GetSessionOperation,
  ): Promise<Result<SessionAttributes, GetSessionFailed>> {
    let response;
    try {
      logger.debug(LogMessage.GET_SESSION_ATTEMPT, {
        data: { sessionId },
      });

      response = await this.dynamoDbClient.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: { sessionId: marshall(sessionId) },
        }),
      );
    } catch (error: unknown) {
      return this.handleGetSessionInternalServerError({
        error,
      });
    }

    const responseItem = response.Item;
    if (responseItem == null) {
      return this.handleGetSessionNotFoundError();
    }

    const getSessionAttributesResult =
      getOperation.getSessionAttributesFromDynamoDbItem(responseItem);
    if (getSessionAttributesResult.isError) {
      const { sessionAttributes } = getSessionAttributesResult.value;
      return this.handleGetSessionInternalServerError({
        error: "Session attributes missing or contains invalid attribute types",
        sessionAttributes,
      });
    }
    const sessionAttributes = getSessionAttributesResult.value;

    const { sessionState, createdAt } = sessionAttributes;
    const validateSessionResult = getOperation.validateSession({
      sessionState,
      createdAt,
    });

    if (validateSessionResult.isError) {
      const { invalidAttributes } = validateSessionResult.value;
      return this.handleGetSessionInvalidError({
        invalidAttributes,
        sessionAttributes,
      });
    }

    logger.debug(LogMessage.GET_SESSION_SUCCESS);
    return successResult(sessionAttributes);
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
      if (
        error instanceof ConditionalCheckFailedException &&
        error.Item != null
      ) {
        const getSessionAttributesOptions = {
          operationFailed: true,
        };
        const getAttributesResult =
          updateOperation.getSessionAttributesFromDynamoDbItem(
            error.Item,
            getSessionAttributesOptions,
          );
        if (getAttributesResult.isError) {
          const { sessionAttributes } = getAttributesResult.value;
          return this.handleUpdateSessionInternalServerError(
            error,
            updateExpressionDataToLog,
            sessionAttributes,
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

    if (response.Attributes == null) {
      return this.handleUpdateSessionInternalServerError(
        "No attributes returned after successful update command",
        updateExpressionDataToLog,
      );
    }

    const getAttributesResult =
      updateOperation.getSessionAttributesFromDynamoDbItem(response.Attributes);

    if (getAttributesResult.isError) {
      const sessionAttributes = unmarshall(response.Attributes);
      return this.handleUpdateSessionInternalServerError(
        "Could not parse valid session attributes after successful update command",
        updateExpressionDataToLog,
        sessionAttributes,
      );
    }

    logger.debug(LogMessage.UPDATE_SESSION_SUCCESS);
    return successResult({ attributes: getAttributesResult.value });
  }

  private handleUpdateSessionInternalServerError(
    error: unknown,
    data: UpdateOperationDataToLog,
    sessionAttributes?: InvalidSessionAttributeTypes,
  ): FailureWithValue<SessionUpdateFailedInternalServerError> {
    logger.error(LogMessage.UPDATE_SESSION_UNEXPECTED_FAILURE, {
      error,
      data,
      sessionAttributes,
    });
    return errorResult({
      errorType: UpdateSessionError.INTERNAL_SERVER_ERROR,
    });
  }

  private handleGetSessionInternalServerError({
    error,
    sessionAttributes,
  }: {
    error: unknown;
    sessionAttributes?: InvalidSessionAttributeTypes;
  }): FailureWithValue<GetSessionInternalServerError> {
    logger.error(LogMessage.GET_SESSION_UNEXPECTED_FAILURE, {
      error,
      sessionAttributes,
    });
    return errorResult({
      errorType: GetSessionError.INTERNAL_SERVER_ERROR,
    });
  }

  private handleGetSessionNotFoundError(): FailureWithValue<GetSessionErrorSessionNotFound> {
    logger.error(LogMessage.GET_SESSION_SESSION_NOT_FOUND);

    return errorResult({
      errorType: GetSessionError.CLIENT_ERROR,
    });
  }

  private handleGetSessionInvalidError({
    invalidAttributes,
    sessionAttributes,
  }: GetSessionValidateSessionErrorData): FailureWithValue<GetSessionSessionInvalidErrorData> {
    logger.error(LogMessage.GET_SESSION_SESSION_INVALID, {
      invalidAttributes,
      sessionAttributes,
    });

    return errorResult({
      errorType: GetSessionError.CLIENT_ERROR,
      data: {
        invalidAttributes,
        sessionAttributes,
      },
    });
  }
}
