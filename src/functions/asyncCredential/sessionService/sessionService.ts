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

export class SessionService implements IGetAuthSessionBySub, ICreateSession {
  readonly tableName: string;
  readonly indexName: string;
  readonly dbClient: DynamoDBClient;

  constructor(tableName: string, indexName: string) {
    this.tableName = tableName;
    this.indexName = indexName;
    this.dbClient = dbClient;
  }

  async getAuthSessionBySub(
    sub: string,
    state: string,
    sessionRecoveryTimeout: number,
  ): Promise<ErrorOrSuccess<string | null>> {
    const queryCommandInput: QueryCommandInput = {
      TableName: this.tableName,
      IndexName: this.indexName,
      KeyConditionExpression:
        "subjectIdentifier = :subjectIdentifier and issuedOn > :issuedOn",
      FilterExpression:
        "authSessionState = :authSessionState and #state <> :state",
      ExpressionAttributeValues: {
        ":subjectIdentifier": { S: sub },
        ":authSessionState": { S: "ASYNC_AUTH_SESSION_CREATED" },
        ":issuedOn": { S: (Date.now() - sessionRecoveryTimeout).toString() },
        ":state": { S: state },
      },
      ExpressionAttributeNames: {
        "#state": "state",
      },
      ProjectionExpression: "sessionId",
      Limit: 1,
      ScanIndexForward: false,
    };

    let result: QueryCommandOutput;
    try {
      result = await dbClient.send(new QueryCommand(queryCommandInput));
    } catch (error) {
      return errorResponse(
        "Unexpected error when querying session table whilst checking for recoverable session",
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
        authSessionId: { S: sessionConfig.authSessionId },
        state: { S: sessionConfig.state },
        sub: { S: sessionConfig.sub },
        client_id: { S: sessionConfig.client_id },
        govuk_signin_journey_id: { S: sessionConfig.govuk_signin_journey_id },
        aud: { S: sessionConfig.aud },
        issuer: { S: sessionConfig.issuer },
        sessionState: { S: sessionConfig.sessionState },
      },
    };

    if (sessionConfig.redirect_uri) {
      config.Item.redirect_uri = { S: sessionConfig.redirect_uri };
    }

    let doesSessionExist;
    try {
      doesSessionExist = await this.checkSessionsExists(
        sessionConfig.authSessionId,
      );
    } catch (error) {
      return errorResponse(
        "Unexpected error when querying session table to check if authSessionId exists",
      );
    }

    if (doesSessionExist) {
      return errorResponse("authSessionId already exists in the database");
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

  private async checkSessionsExists(authSessionId: string): Promise<boolean> {
    const output = await dbClient.send(
      new GetItemCommand({
        TableName: this.tableName,
        Key: {
          sessionId: { S: authSessionId },
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
  authSessionId: string;
  state: string;
  sub: string;
  client_id: string;
  govuk_signin_journey_id: string;
  aud: string;
  issuer: string;
  sessionState: string;
  redirect_uri?: string;
}

interface IPutAuthSessionConfig {
  TableName: string;
  Item: {
    authSessionId: { S: string };
    state: { S: string };
    sub: { S: string };
    client_id: { S: string };
    govuk_signin_journey_id: { S: string };
    aud: { S: string };
    issuer: { S: string };
    sessionState: { S: string };
    redirect_uri?: { S: string };
  };
}

export interface IGetAuthSessionBySub {
  getAuthSessionBySub: (
    sub: string,
    state: string,
    sessionRecoveryTimeout: number,
  ) => Promise<ErrorOrSuccess<string | null>>;
}

export interface ICreateSession {
  createSession: (sessionConfig: IAuthSession) => Promise<ErrorOrSuccess<null>>;
}

type IQueryCommandOutputType = {
  Items?: { sessionId?: { S: string } }[];
};
