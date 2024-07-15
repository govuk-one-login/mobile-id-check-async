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

export class recoverSessionService implements IRecoverAuthSession {
  readonly tableName: string;
  readonly indexName: string;
  readonly dbClient: DynamoDBClient;

  constructor(
    tableName: string,
    indexName: string,
    overrideDbClient?: DynamoDBClient,
  ) {
    this.tableName = tableName;
    this.indexName = indexName;
    this.dbClient = overrideDbClient ?? dbClient;
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
        ":authSessionState": { S: "mockValidState" },
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

    if (
      result.Items &&
      result.Items.length > 0 &&
      result.Items[0].sessionId !== undefined &&
      result.Items[0].sessionId.S
    ) {
      return successResponse(result.Items[0].sessionId.S);
    }

    return successResponse(null);
  }
}

export interface IRecoverAuthSession {
  getAuthSessionBySub: (
    sub: string,
    state: string,
    sessionRecoveryTimeout: number,
  ) => Promise<ErrorOrSuccess<string | null>>;
}
