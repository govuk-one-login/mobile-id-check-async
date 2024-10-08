import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  PutItemCommand,
  PutItemCommandInput,
  QueryCommand,
  QueryCommandInput,
  QueryCommandOutput,
} from "@aws-sdk/client-dynamodb";
import { errorResult, Result, successResult } from "../../utils/result";
import { randomUUID } from "crypto";
import {
  IDataStore,
  CreateSessionAttributes,
  SessionId,
  SessionDetails,
} from "./datastore";
import { marshall } from "@aws-sdk/util-dynamodb";
import { NodeHttpHandler } from "@smithy/node-http-handler";

export class DynamoDbAdapter implements IDataStore {
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
  ): Promise<Result<SessionId | null>> {
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

    let output: QueryCommandOutput;
    try {
      output = await this.dynamoDbClient.send(new QueryCommand(input));
    } catch (error) {
      console.log(error);
      return errorResult({
        errorMessage:
          "Unexpected error when querying database to get an active session's ID",
        errorCategory: "SERVER_ERROR",
      });
    }

    const retrievedItems = output.Items;

    if (!retrievedItems || retrievedItems.length === 0) {
      return successResult(null);
    }

    const retrievedItem = retrievedItems[0];
    const sessionId = retrievedItem.sessionId?.S;
    if (!sessionId) {
      return errorResult({
        errorMessage: "Session is malformed",
        errorCategory: "SERVER_ERROR",
      });
    }

    return successResult(sessionId as SessionId);
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
      ProjectionExpression: "sessionId, redirect_uri, #state",
      Limit: 1,
      ScanIndexForward: false,
    };

    let output: QueryCommandOutput;
    try {
      output = await this.dynamoDbClient.send(new QueryCommand(input));
    } catch (error) {
      console.log(error);
      return errorResult({
        errorMessage:
          "Unexpected error when querying database to get an active session's details",
        errorCategory: "SERVER_ERROR",
      });
    }

    const retrievedItems = output.Items;

    if (!retrievedItems || retrievedItems.length === 0) {
      return successResult(null);
    }

    const retrievedItem = retrievedItems[0];
    const sessionId = retrievedItem.sessionId?.S;
    const state = retrievedItem.state?.S;
    if (!sessionId || !state) {
      return errorResult({
        errorMessage: "Session is malformed",
        errorCategory: "SERVER_ERROR",
      });
    }

    const redirectUri: string | undefined = retrievedItem.redirectUri?.S;
    const sessionDetails: SessionDetails = {
      sessionId,
      state,
      ...(redirectUri && { redirectUri: retrievedItem.redirectUri?.S }),
    };

    return successResult(sessionDetails);
  }

  async createSession(
    attributes: CreateSessionAttributes,
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
    const sessionId = randomUUID();
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    const timeToLive = currentTimeInSeconds + sessionDurationInSeconds;

    const input: PutItemCommandInput = {
      TableName: this.tableName,
      Item: marshall({
        clientId: client_id,
        govukSigninJourneyId: govuk_signin_journey_id,
        createdAt: Date.now(),
        issuer: issuer,
        sessionId: sessionId,
        sessionState: "ASYNC_AUTH_SESSION_CREATED",
        state: state,
        subjectIdentifier: sub,
        timeToLive: timeToLive,
      }),
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
}
