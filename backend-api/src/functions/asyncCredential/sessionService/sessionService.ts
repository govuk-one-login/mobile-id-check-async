import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  QueryCommandInput,
  QueryCommandOutput,
} from "@aws-sdk/client-dynamodb";
import { dbClient } from "./dynamoDbClient";
import {
  ErrorOrSuccess,
  errorResponse,
  successResponse,
} from "../../types/errorOrValue";
import { randomUUID } from "crypto";

export class SessionService implements IGetActiveSession, ICreateSession {
  readonly tableName: string;
  readonly indexName: string;
  readonly dbClient: DynamoDBClient;

  constructor(tableName: string, indexName: string) {
    this.tableName = tableName;
    this.indexName = indexName;
    this.dbClient = dbClient;
  }

  async getActiveSession(
    sub: string,
    sessionTimeToLiveInMilliseconds: number,
  ): Promise<ErrorOrSuccess<string | null>> {
    const queryCommandInput: QueryCommandInput = {
      TableName: this.tableName,
      IndexName: this.indexName,
      KeyConditionExpression: "#sub = :sub and #sessionState = :sessionState",
      FilterExpression:
        ":currentTimeInMs < #issuedOn + :sessionTimeToLiveInMilliseconds",
      ExpressionAttributeNames: {
        "#issuedOn": "issuedOn",
        "#sessionId": "sessionId",
        "#sessionState": "sessionState",
        "#sub": "sub",
      },
      ExpressionAttributeValues: {
        ":sub": { S: sub },
        ":sessionState": { S: "ASYNC_AUTH_SESSION_CREATED" },
        ":currentTimeInMs": {
          S: Date.now().toString(),
        },
        ":sessionTtlInMs": {
          S: sessionTimeToLiveInMilliseconds.toString(),
        },
      },
      ProjectionExpression: "#sessionId",
      Limit: 1,
      ScanIndexForward: false,
    };

    let result: QueryCommandOutput;
    try {
      result = await dbClient.send(new QueryCommand(queryCommandInput));
    } catch (error) {
      return errorResponse(
        "Unexpected error when querying session table whilst checking for an active session",
      );
    }

    if (!this.hasValidSession(result)) {
      return successResponse(null);
    }

    return successResponse(result.Items[0].sessionId.S);
  }

  async createSession(
    config: ICreateSessionConfig,
  ): Promise<ErrorOrSuccess<string>> {
    const sessionId = randomUUID();
    const putSessionConfig = this.buildSession(sessionId, config);

    let doesSessionExist;
    try {
      doesSessionExist = await this.checkSessionsExists(sessionId);
    } catch (error) {
      return errorResponse(
        "Unexpected error when querying session table to check if sessionId exists",
      );
    }

    if (doesSessionExist) {
      return errorResponse("sessionId already exists in the database");
    }

    try {
      await this.putSessionInDb(putSessionConfig);
    } catch (error) {
      return errorResponse(
        "Unexpected error when querying session table whilst creating a session",
      );
    }

    return successResponse(sessionId);
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

  private buildSession(sessionId: string, config: ICreateSessionConfig) {
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
    sub: string,
    sessionTimeToLiveInMilliseconds: number,
  ) => Promise<ErrorOrSuccess<string | null>>;
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
  createSession: (
    config: ICreateSessionConfig,
  ) => Promise<ErrorOrSuccess<string>>;
}

type IQueryCommandOutputType = {
  Items?: { sessionId?: { S: string } }[];
};
