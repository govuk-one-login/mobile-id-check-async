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
    sessionConfig: IAuthSession,
  ): Promise<ErrorOrSuccess<null>> {
    const config: IPutAuthSessionConfig = {
      TableName: this.tableName,
      Item: {
        sessionId: { S: sessionConfig.sessionId },
        state: { S: sessionConfig.state },
        sub: { S: sessionConfig.sub },
        clientId: { S: sessionConfig.clientId },
        govukSigninJourneyId: { S: sessionConfig.govukSigninJourneyId },
        issuer: { S: sessionConfig.issuer },
        sessionState: { S: sessionConfig.sessionState },
      },
    };

    if (sessionConfig.redirectUri) {
      config.Item.redirectUri = { S: sessionConfig.redirectUri };
    }

    let doesSessionExist;
    try {
      doesSessionExist = await this.checkSessionsExists(
        sessionConfig.sessionId,
      );
    } catch (error) {
      return errorResponse(
        "Unexpected error when querying session table to check if sessionId exists",
      );
    }

    if (doesSessionExist) {
      return errorResponse("sessionId already exists in the database");
    }

    try {
      await this.putSessionInDb(config);
    } catch (error) {
      return errorResponse(
        "Unexpected error when querying session table whilst creating a session",
      );
    }

    return successResponse(null);
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

  private async putSessionInDb(config: IPutAuthSessionConfig) {
    await dbClient.send(new PutItemCommand(config));
  }
}

interface IAuthSession {
  sessionId: string;
  state: string;
  sub: string;
  clientId: string;
  govukSigninJourneyId: string;
  issuer: string;
  sessionState: string;
  redirectUri?: string;
}

interface IPutAuthSessionConfig {
  TableName: string;
  Item: {
    sessionId: { S: string };
    state: { S: string };
    sub: { S: string };
    clientId: { S: string };
    govukSigninJourneyId: { S: string };
    issuer: { S: string };
    sessionState: { S: string };
    redirectUri?: { S: string };
  };
}

export interface IGetActiveSession {
  getActiveSession: (
    sub: string,
    sessionTimeToLiveInMilliseconds: number,
  ) => Promise<ErrorOrSuccess<string | null>>;
}

export interface ICreateSession {
  createSession: (sessionConfig: IAuthSession) => Promise<ErrorOrSuccess<null>>;
}

type IQueryCommandOutputType = {
  Items?: { sessionId?: { S: string } }[];
};
