import {
  DynamoDBClient,
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

export class SessionService implements IRecoverAuthSession {
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
    sessionConfig: ICreateSessionConfig,
  ): Promise<ErrorOrSuccess<null>> {
    const config = {
      TableName: this.tableName,
      authSessionId: { S: sessionConfig.authSessionId },
      state: { S: sessionConfig.state },
      sub: { S: sessionConfig.sub },
      client_id: { S: sessionConfig.client_id },
      govuk_signin_journey_id: { S: sessionConfig.govuk_signin_journey_id },
      redirect_uri: { S: sessionConfig.redirect_uri },
      issuer: { S: sessionConfig.issuer },
      sessionState: { S: sessionConfig.sessionState },
    };

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
}

interface ICreateSessionConfig {
  authSessionId: string;
  state: string;
  sub: string;
  client_id: string;
  govuk_signin_journey_id: string;
  redirect_uri: string;
  issuer: string;
  sessionState: string;
}

export interface IRecoverAuthSession {
  getAuthSessionBySub: (
    sub: string,
    state: string,
    sessionRecoveryTimeout: number,
  ) => Promise<ErrorOrSuccess<string | null>>;
}

type IQueryCommandOutputType = {
  Items?: { sessionId?: { S: string } }[];
};
