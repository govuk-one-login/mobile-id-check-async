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

export class RecoverSessionService implements IRecoverAuthSession {
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
        ":authSessionState": { S: "mockValidState" }, //TODO Get dynamically
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
