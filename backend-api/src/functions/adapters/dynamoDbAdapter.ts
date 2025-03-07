import {
  AttributeValue,
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
import { CreateSessionAttributes } from "../services/session/sessionService";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import {
  marshall,
  NativeAttributeValue,
  unmarshall,
} from "@aws-sdk/util-dynamodb";
import { UpdateSessionOperation } from "../common/session/updateOperations/UpdateSessionOperation";
import {
  errorResult,
  FailureWithValue,
  Result,
  successResult,
} from "../utils/result";
import {
  SessionRegistry,
  UpdateExpressionDataToLog,
  UpdateSessionError,
  SessionUpdateFailed,
  SessionUpdateFailedInternalServerError,
  SessionUpdated,
  SessionRetrieved,
  SessionRetrievalFailed,
  GetSessionError,
  GetItemCommandDataToLog,
  SessionRetrievalFailedInternalServerError,
} from "../common/session/SessionRegistry";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { SessionAttributes, SessionState } from "../common/session/session";
import {
  getBaseSessionAttributes,
  getBiometricTokenIssuedSessionAttributes,
} from "../common/session/updateOperations/sessionAttributes/sessionAttributes";

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
    sessionId: string,
  ): Promise<Result<SessionRetrieved, SessionRetrievalFailed>> {
    const getItemCommandKey = { Key: { S: { sessionId } } };

    logger.debug(LogMessage.GET_SESSION_ATTEMPT, {
      data: getItemCommandKey,
    });

    let response;
    try {
      response = await this.dynamoDbClient.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: marshall({ sessionId }),
        }),
      );
    } catch (error) {
      return this.handleGetSessionInternalServerError(error, getItemCommandKey);
    }

    const responseItem = response.Item;
    if (responseItem == null) {
      logger.error(LogMessage.GET_SESSION_SESSION_NOT_FOUND, {
        data: getItemCommandKey,
      });
      return errorResult({
        errorType: GetSessionError.SESSION_NOT_FOUND,
      });
    }

    const getSessionAttributesResult =
      this.getSessionAttributesFromDynamoDbItem(responseItem);
    if (getSessionAttributesResult.isError) {
      return this.handleGetSessionInternalServerError(
        "Could not parse valid session attributes after successful update command",
        getItemCommandKey,
      );
    }

    logger.debug(LogMessage.GET_SESSION_SUCCESS);

    return successResult({ item: getSessionAttributesResult.value });

    // return successResult({
    //   clientId: "mockClientId",
    //   govukSigninJourneyId: "mockGovukSigninJourneyId",
    //   createdAt: 12345,
    //   issuer: "mockIssuer",
    //   sessionId: "mockSessionId",
    //   sessionState: SessionState.BIOMETRIC_TOKEN_ISSUED,
    //   clientState: "mockClientState",
    //   subjectIdentifier: "mockSubjectIdentifier",
    //   timeToLive: 12345,
    //   documentType: "NFC_PASSPORT",
    //   opaqueId: "mockOpaqueId",
    // })
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
        const getAttributesResult = this.getSessionAttributesFromDynamoDbItem(
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

    const getAttributesResult = this.getSessionAttributesFromDynamoDbItem(
      response.Attributes,
    );

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
    getItemCommandDataToLog: GetItemCommandDataToLog,
  ): FailureWithValue<SessionRetrievalFailedInternalServerError> {
    logger.error(LogMessage.UPDATE_SESSION_UNEXPECTED_FAILURE, {
      error,
      data: getItemCommandDataToLog,
    });
    return errorResult({
      errorType: GetSessionError.INTERNAL_SERVER_ERROR,
    });
  }

  private getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue> | undefined,
    options?: {
      operationFailed: boolean;
    },
  ): Result<SessionAttributes, void> {
    if (options?.operationFailed) {
      return getBaseSessionAttributes(item);
    } else {
      return getBiometricTokenIssuedSessionAttributes(item);
    }
  }
}
