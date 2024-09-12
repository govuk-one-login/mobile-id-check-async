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
    sessionTimeToLiveInMilliseconds: number,
  ): Promise<Result<string | null>> {
    const currentTimeInMs = Date.now()
    const sessionTtlExpiry = currentTimeInMs - sessionTimeToLiveInMilliseconds

    const queryCommandInput: QueryCommandInput = {
      TableName: this.tableName,
      IndexName: "subjectIdentifier",
      KeyConditionExpression: "#subjectIdentifier = :subjectIdentifier and #sessionState = :sessionState",
      FilterExpression: "#issuedOn > :sessionTtlExpiry",
      ExpressionAttributeNames: {
        "#issuedOn": "issuedOn",
        "#sessionId": "sessionId",
        "#sessionState": "sessionState",
        "#subjectIdentifier": "subjectIdentifier",
      },
      ExpressionAttributeValues: {
        ":subjectIdentifier": { S: subjectIdentifier },
        ":sessionState": { S: "ASYNC_AUTH_SESSION_CREATED" },
        ":sessionTtlExpiry": {
          N: sessionTtlExpiry.toString(),
        },
      },
      ProjectionExpression: "#sessionId",
      Limit: 1,
      ScanIndexForward: false,
    };

    let result: QueryCommandOutput;
    try {
      result = await dbClient.send(new QueryCommand(queryCommandInput));
    } catch (err) {
      console.log("ERROR >>>", err)
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

  async createSession(config: ICreateSessionConfig): Promise<Result<string>> {
    const sessionId = randomUUID();
    const putSessionConfig = this.buildPutItemCommandInput(sessionId, config);

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
      await this.putSessionInDb(putSessionConfig);
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
    config: ICreateSessionConfig,
  ) {
    const {
      state,
      sub,
      client_id,
      govuk_signin_journey_id,
      redirect_uri,
      issuer,
    } = config;

    const putSessionConfig: IPutSessionConfig = {
      TableName: this.tableName,
      Item: {
        sessionId: { S: sessionId },
        state: { S: state },
        sub: { S: sub },
        clientId: { S: client_id },
        govukSigninJourneyId: { S: govuk_signin_journey_id },
        issuer: { S: issuer },
        sessionState: { S: "ASYNC_AUTH_SESSION_CREATED" },
        issuedOn: { S: Date.now().toString() },
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

  private async putSessionInDb(config: IPutSessionConfig) {
    await dbClient.send(new PutItemCommand(config));
  }
}

interface IPutSessionConfig {
  TableName: string;
  Item: {
    sessionId: { S: string };
    state: { S: string };
    sub: { S: string };
    clientId: { S: string };
    govukSigninJourneyId: { S: string };
    issuer: { S: string };
    sessionState: { S: string };
    issuedOn: { S: string };
    redirectUri?: { S: string };
  };
}

export interface IGetActiveSession {
  getActiveSession: (
    subjectIdentifier: string,
    sessionTimeToLiveInSeconds: number,
  ) => Promise<Result<string | null>>;
}

interface ICreateSessionConfig {
  state: string;
  sub: string;
  client_id: string;
  govuk_signin_journey_id: string;
  issuer: string;
  redirect_uri?: string;
}

export interface ICreateSession {
  createSession: (config: ICreateSessionConfig) => Promise<Result<string>>;
}

type IQueryCommandOutputType = {
  Items?: { sessionId?: { S: string } }[];
};
