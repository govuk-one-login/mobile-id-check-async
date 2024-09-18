import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  QueryCommandInput,
  QueryCommandOutput,
} from "@aws-sdk/client-dynamodb";
import { dbClient } from "./dynamoDbClient";
import { randomUUID } from "crypto";
import { errorResult, Result, successResult } from "../../utils/result";

export class SessionService implements IGetActiveSession, ICreateSession {
  readonly tableName: string;
  readonly dbClient: DynamoDBClient;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.dbClient = dbClient;
  }

  async getActiveSession(
    subjectIdentifier: string,
  ): Promise<Result<string | null>> {
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);

    const queryCommandInput: QueryCommandInput = {
      TableName: this.tableName,
      IndexName: "subjectIdentifier-timeToLive-index",
      KeyConditionExpression:
        "#subjectIdentifier = :subjectIdentifier and :currentTimeInSeconds < #timeToLive",
      FilterExpression: "#sessionState = :sessionState",
      ExpressionAttributeNames: {
        "#timeToLive": "timeToLive",
        "#sessionId": "sessionId",
        "#sessionState": "sessionState",
        "#subjectIdentifier": "subjectIdentifier",
      },
      ExpressionAttributeValues: {
        ":subjectIdentifier": { S: subjectIdentifier },
        ":sessionState": { S: "ASYNC_AUTH_SESSION_CREATED" },
        ":currentTimeInSeconds": {
          N: currentTimeInSeconds.toString(),
        },
      },
      ProjectionExpression: "#sessionId",
      Limit: 1,
      ScanIndexForward: false,
    };

    let result: QueryCommandOutput;
    try {
      result = await dbClient.send(new QueryCommand(queryCommandInput));
    } catch {
      return errorResult({
        errorMessage:
          "Unexpected error when querying session table whilst checking for an active session",
        errorCategory: "SERVER_ERROR",
      });
    }

    if (!this.hasValidSession(result)) {
      return successResult(null);
    }

    return successResult(result.Items[0].sessionId.S);
  }

  async createSession(
    attributes: ICreateSessionAttributes,
  ): Promise<Result<string>> {
    const sessionId = randomUUID();
    const putSessionConfig = this.buildPutItemCommandInput(
      sessionId,
      attributes,
    );

    let doesSessionExist;
    try {
      doesSessionExist = await this.checkSessionsExists(sessionId);
    } catch {
      return errorResult({
        errorMessage:
          "Unexpected error when querying session table to check if sessionId exists",
        errorCategory: "SERVER_ERROR",
      });
    }

    if (doesSessionExist) {
      return errorResult({
        errorMessage: "sessionId already exists in the database",
        errorCategory: "SERVER_ERROR",
      });
    }

    try {
      await dbClient.send(new PutItemCommand(putSessionConfig));
    } catch {
      return errorResult({
        errorMessage:
          "Unexpected error when querying session table whilst creating a session",
        errorCategory: "SERVER_ERROR",
      });
    }
    return successResult(sessionId);
  }

  private hasValidSession(
    result: IQueryCommandOutputType,
  ): result is { Items: [{ sessionId: { S: string } }] } {
    return (
      Array.isArray(result.Items) &&
      result.Items.length > 0 &&
      result.Items[0].sessionId != null &&
      result.Items[0].sessionId.S !== ""
    );
  }

  private buildPutItemCommandInput(
    sessionId: string,
    attributes: ICreateSessionAttributes,
  ): ISessionPutItemCommandInput {
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

    const putSessionConfig: ISessionPutItemCommandInput = {
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
    };

    if (redirect_uri) {
      putSessionConfig.Item.redirectUri = { S: redirect_uri };
    }

    return putSessionConfig;
  }

  private async checkSessionsExists(sessionId: string): Promise<boolean> {
    const output = await dbClient.send(
      new GetItemCommand({
        TableName: this.tableName,
        Key: {
          sessionId: { S: sessionId },
        },
      }),
    );

    return output.Item != null;
  }
}

interface ISessionPutItemCommandInput {
  TableName: string;
  Item: {
    clientId: { S: string };
    govukSigninJourneyId: { S: string };
    createdAt: { N: string };
    issuer: { S: string };
    redirectUri?: { S: string };
    sessionId: { S: string };
    sessionState: { S: string };
    state: { S: string };
    subjectIdentifier: { S: string };
    timeToLive: { N: string };
  };
}

export interface IGetActiveSession {
  getActiveSession: (
    subjectIdentifier: string,
  ) => Promise<Result<string | null>>;
}

interface ICreateSessionAttributes {
  client_id: string;
  govuk_signin_journey_id: string;
  issuer: string;
  redirect_uri?: string;
  sessionDurationInSeconds: number;
  state: string;
  sub: string;
}

export interface ICreateSession {
  createSession: (
    attributes: ICreateSessionAttributes,
  ) => Promise<Result<string>>;
}

type IQueryCommandOutputType = {
  Items?: { sessionId?: { S: string } }[];
};
