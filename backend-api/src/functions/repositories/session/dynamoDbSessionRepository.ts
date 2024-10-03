import {
  ConditionalCheckFailedException,
  PutItemCommandInput,
  QueryCommandInput,
} from "@aws-sdk/client-dynamodb";
import { errorResult, Result, successResult } from "../../utils/result";
import { randomUUID } from "crypto";
import { DynamoDb } from "./dynamoDb";
import {
  CreateSessionAttributes,
  ISessionRepository,
  Session,
} from "./sessionRepository";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

export class DynamoDbSessionRepository implements ISessionRepository {
  private readonly tableName: string;
  private readonly dynamoDbService = new DynamoDb();

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async read(subjectIdentifier: string): Promise<Result<Session | null>> {
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);

    const commandInput: QueryCommandInput = {
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

    let queryOutput;
    try {
      queryOutput = await this.dynamoDbService.query(commandInput);
    } catch {
      return errorResult({
        errorMessage:
          "Unexpected error when querying database for an active session",
        errorCategory: "SERVER_ERROR",
      });
    }

    if (queryOutput.Items === undefined || queryOutput.Items.length === 0) {
      return successResult(null);
    }

    return successResult(unmarshall(queryOutput.Items[0]) as Session);
  }

  async create(attributes: CreateSessionAttributes): Promise<Result<string>> {
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

    const commandInput: PutItemCommandInput = {
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
      commandInput.Item!.redirectUri = { S: redirect_uri };
    }

    try {
      await this.dynamoDbService.putItem(commandInput);
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
