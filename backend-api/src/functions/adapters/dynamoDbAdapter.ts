import {
  AttributeValue,
  ConditionalCheckFailedException,
  DynamoDBClient,
  PutItemCommand,
  PutItemCommandInput,
  QueryCommand,
  QueryCommandInput,
  QueryCommandOutput,
} from "@aws-sdk/client-dynamodb";
import { errorResult, Result, successResult } from "../utils/result";
import {
  CreateSessionAttributes,
  SessionDetails,
} from "../services/sessionService/sessionService";
import { NodeHttpHandler } from "@smithy/node-http-handler";

type DynamoDbRecord = Record<string, AttributeValue>;

export class DynamoDbAdapter {
  private readonly tableName: string;
  private readonly dynamoDbClient = new DynamoDBClient({
    region: process.env.REGION,
    maxAttempts: 2,
    requestHandler: new NodeHttpHandler({
      connectionTimeout: 29000,
      requestTimeout: 29000,
    }),
  });

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async readSessionId(
    subjectIdentifier: string,
  ): Promise<Result<string | null>> {
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    const input: QueryCommandInput = {
      TableName: this.tableName,
      IndexName: "subjectIdentifier-timeToLive-index",
      KeyConditionExpression:
        "subjectIdentifier = :subjectIdentifier and :currentTimeInSeconds < timeToLive",
      FilterExpression: "sessionState = :sessionState",
      ExpressionAttributeValues: {
        ":subjectIdentifier": { S: subjectIdentifier },
        ":sessionState": { S: "ASYNC_AUTH_SESSION_CREATED" },
        ":currentTimeInSeconds": {
          N: currentTimeInSeconds.toString(),
        },
      },
      ProjectionExpression: "sessionId",
      Limit: 1,
      ScanIndexForward: false,
    };

    const queryResponse = await this.query(input);
    if (queryResponse.isError || queryResponse.value === null) {
      return queryResponse;
    }

    const record: DynamoDbRecord = queryResponse.value;
    const sessionId = record.sessionId?.S;
    if (!sessionId) {
      return errorResult({
        errorMessage: "Session is malformed",
        errorCategory: "SERVER_ERROR",
      });
    }

    return successResult(sessionId);
  }

  async readSessionDetails(
    subjectIdentifier: string,
  ): Promise<Result<SessionDetails | null>> {
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    const input: QueryCommandInput = {
      TableName: this.tableName,
      IndexName: "subjectIdentifier-timeToLive-index",
      KeyConditionExpression:
        "subjectIdentifier = :subjectIdentifier and :currentTimeInSeconds < timeToLive",
      FilterExpression: "sessionState = :sessionState",
      ExpressionAttributeValues: {
        ":subjectIdentifier": { S: subjectIdentifier },
        ":sessionState": { S: "ASYNC_AUTH_SESSION_CREATED" },
        ":currentTimeInSeconds": {
          N: currentTimeInSeconds.toString(),
        },
      },
      ExpressionAttributeNames: { "#state": "state" },
      ProjectionExpression: "sessionId, redirectUri, #state",
      Limit: 1,
      ScanIndexForward: false,
    };

    const queryResponse = await this.query(input);
    if (queryResponse.isError || queryResponse.value === null) {
      return queryResponse;
    }

    const record: DynamoDbRecord = queryResponse.value;
    const sessionId = record.sessionId?.S;
    const state = record.state?.S;
    if (!sessionId || !state) {
      return errorResult({
        errorMessage: "Session is malformed",
        errorCategory: "SERVER_ERROR",
      });
    }
    const redirectUri: string | undefined = record.redirectUri?.S;
    const sessionDetails: SessionDetails = {
      sessionId,
      state,
      ...(redirectUri && { redirectUri: record.redirectUri?.S }),
    };

    return successResult(sessionDetails);
  }

  async createSession(
    attributes: CreateSessionAttributes,
    sessionId: string,
  ): Promise<Result<string>> {
    const {
      client_id,
      govuk_signin_journey_id,
      issuer,
      redirect_uri,
      sessionDurationInSeconds,
      state,
      sub,
    } = attributes;
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    const timeToLive = currentTimeInSeconds + sessionDurationInSeconds;

    const input: PutItemCommandInput = {
      TableName: this.tableName,
      Item: {
        clientId: { S: client_id },
        govukSigninJourneyId: { S: govuk_signin_journey_id },
        createdAt: { N: Date.now().toString() },
        issuer: { S: issuer },
        sessionId: { S: sessionId },
        sessionState: { S: "ASYNC_AUTH_SESSION_CREATED" },
        state: { S: state },
        subjectIdentifier: { S: sub },
        timeToLive: { N: timeToLive.toString() },
      },
      ConditionExpression: "attribute_not_exists(sessionId)",
    };

    if (redirect_uri) {
      input.Item!.redirectUri = { S: redirect_uri };
    }

    try {
      await this.dynamoDbClient.send(new PutItemCommand(input));
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        return errorResult({
          errorMessage: "Session already exists with this ID",
          errorCategory: "SERVER_ERROR",
        });
      } else {
        return errorResult({
          errorMessage: "Unexpected error while creating a new session",
          errorCategory: "SERVER_ERROR",
        });
      }
    }

    return successResult(sessionId);
  }

  private async query(
    input: QueryCommandInput,
  ): Promise<Result<DynamoDbRecord> | Result<null>> {
    let output: QueryCommandOutput;
    try {
      output = await this.dynamoDbClient.send(new QueryCommand(input));
    } catch {
      return errorResult({
        errorMessage: "Unexpected error when querying database",
        errorCategory: "SERVER_ERROR",
      });
    }

    if (!output.Items || output.Items.length === 0) {
      return successResult(null);
    }

    return successResult(output.Items[0]);
  }
}
