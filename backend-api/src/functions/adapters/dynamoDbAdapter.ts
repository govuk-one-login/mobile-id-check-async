import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  GetItemCommand,
  GetItemCommandOutput,
  PutItemCommand,
  PutItemCommandInput,
  QueryCommand,
  QueryCommandInput,
  QueryCommandOutput,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { CreateSessionAttributes } from "../services/session/sessionService";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import {
  marshall,
  NativeAttributeValue,
  unmarshall,
} from "@aws-sdk/util-dynamodb";
import {
  emptySuccess,
  errorResult,
  Failure,
  Result,
  successResult,
} from "../utils/result";
import {
  AuthSessionCreatedSession,
  BiometricSessionFinishedSession,
  BiometricTokenIssuedSession,
  IUpdateSessionOperation,
  Session,
  SessionState,
} from "../common/session/Session";
import {
  getDynamoDBItemToSessionConvertor,
  InvalidFieldsError,
} from "./dynamoDBItemToSessionConvertors";

const sessionStates = {
  ASYNC_AUTH_SESSION_CREATED: "ASYNC_AUTH_SESSION_CREATED",
};

export type DatabaseRecord = Record<string, NativeAttributeValue>;

export class DynamoDbAdapter {
  private readonly tableName: string;
  private readonly dynamoDbClient = new DynamoDBClient({
    region: process.env.REGION,
    maxAttempts: 2,
    requestHandler: new NodeHttpHandler({
      connectionTimeout: 5000,
      requestTimeout: 5000,
    }),
  });

  constructor(
    tableName: string,
    private readonly getItemToSessionConvertor = getDynamoDBItemToSessionConvertor,
  ) {
    this.tableName = tableName;
  }

  async getSessionWithState(
    sessionId: string,
    sessionState: SessionState.AUTH_SESSION_CREATED,
  ): Promise<Result<AuthSessionCreatedSession, ReadSessionError>>;
  async getSessionWithState(
    sessionId: string,
    sessionState: SessionState.BIOMETRIC_TOKEN_ISSUED,
  ): Promise<Result<BiometricTokenIssuedSession, ReadSessionError>>;
  async getSessionWithState(
    sessionId: string,
    sessionState: SessionState.BIOMETRIC_SESSION_FINISHED,
  ): Promise<Result<BiometricSessionFinishedSession, ReadSessionError>>;
  async getSessionWithState(
    sessionId: string,
    sessionState: SessionState.RESULT_SENT,
  ): Promise<Result<BiometricSessionFinishedSession, ReadSessionError>>;
  async getSessionWithState(
    sessionId: string,
    sessionState: SessionState,
  ): Promise<Result<Session, ReadSessionError>> {
    let output: GetItemCommandOutput;
    try {
      console.log("Get session attempt"); // replace with proper logging
      output = await this.getItemWithStronglyConsistentFallback(
        sessionId,
        sessionState,
      );
    } catch (error) {
      console.log(error); // replace with proper logging
      return errorResult({
        reason: ReadSessionErrorReason.INTERNAL_SERVER_ERROR,
      });
    }

    const item = output.Item;
    if (!item) {
      console.log("session not found"); // replace with proper logging
      return errorResult({
        reason: ReadSessionErrorReason.NOT_FOUND,
      });
    }

    const convertItemToSession = this.getItemToSessionConvertor(sessionState);
    const conversionResult = convertItemToSession(item);
    if (conversionResult.isError) {
      return this.handleSessionConversionFailure(conversionResult.value);
    }

    const session = conversionResult.value;
    if (session.sessionState !== sessionState) {
      console.log("session in invalid state"); // replace with proper logging
      return errorResult({
        reason: ReadSessionErrorReason.NOT_FOUND,
      });
    }

    console.log("Get session success"); // replace with proper logging

    if (session.sessionState === SessionState.BIOMETRIC_TOKEN_ISSUED) {
      return successResult(session);
    }
    if (session.sessionState === SessionState.BIOMETRIC_SESSION_FINISHED) {
      return successResult(session);
    }
    if (session.sessionState === SessionState.RESULT_SENT) {
      return successResult(session);
    }
    return successResult(session);
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
        ":sessionState": marshall(sessionStates.ASYNC_AUTH_SESSION_CREATED),
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
        sessionState: sessionStates.ASYNC_AUTH_SESSION_CREATED,
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

  async updateSession(
    sessionId: string,
    updateOperation: IUpdateSessionOperation,
  ): Promise<Result<void>> {
    console.log("Update session attempt"); // replace with proper logging
    try {
      await this.dynamoDbClient.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            sessionId: { S: sessionId },
          },
          UpdateExpression: updateOperation.getDynamoDbUpdateExpression(),
          ConditionExpression: updateOperation.getDynamoDbConditionExpression(),
          ExpressionAttributeValues:
            updateOperation.getDynamoDbExpressionAttributeValues(),
        }),
      );
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        console.log(
          "Conditional check failed",
          updateOperation.getDynamoDbConditionExpression(),
        ); // replace with proper logging
        return errorResult({
          errorMessage: "Conditional check failed",
          errorCategory: "CLIENT_ERROR",
        });
      } else {
        console.log("Unexpected error", error); // replace with proper logging
        return errorResult({
          errorMessage: "Unexpected error",
          errorCategory: "SERVER_ERROR",
        });
      }
    }
    console.log(
      "Update session success",
      updateOperation.getDynamoDbUpdateExpression(),
    ); // replace with proper logging
    return emptySuccess();
  }

  private getTimeNowInSeconds() {
    return Math.floor(Date.now() / 1000);
  }

  private async getItemWithStronglyConsistentFallback(
    sessionId: string,
    sessionState: SessionState,
  ): Promise<GetItemCommandOutput> {
    let output: GetItemCommandOutput;
    // First attempt a cheaper, eventually consistent read
    output = await this.dynamoDbClient.send(
      new GetItemCommand({
        TableName: this.tableName,
        ConsistentRead: false,
        Key: {
          sessionId: { S: sessionId },
        },
      }),
    );

    if (!output.Item || output.Item?.sessionState?.S !== sessionState) {
      // Follow up with strongly consistent read in case session state update not yet visible
      output = await this.dynamoDbClient.send(
        new GetItemCommand({
          TableName: this.tableName,
          ConsistentRead: true,
          Key: {
            sessionId: { S: sessionId },
          },
        }),
      );
    }
    return output;
  }

  private handleSessionConversionFailure(
    error: InvalidFieldsError,
  ): Failure<ReadSessionError> {
    const invalidFields = error.invalidFields;
    console.log(invalidFields); // replace with proper logging
    return this.readSessionFailure(
      ReadSessionErrorReason.INTERNAL_SERVER_ERROR,
    );
  }

  private readSessionFailure(
    reason: ReadSessionErrorReason,
  ): Failure<ReadSessionError> {
    return errorResult({
      reason: reason,
    });
  }
}

export interface ReadSessionError {
  reason: ReadSessionErrorReason;
}

export enum ReadSessionErrorReason {
  NOT_FOUND = "not_found",
  INTERNAL_SERVER_ERROR = "internal_server_error",
}
