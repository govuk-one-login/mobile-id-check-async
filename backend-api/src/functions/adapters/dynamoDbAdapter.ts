import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  PutItemCommand,
  PutItemCommandInput,
  QueryCommand,
  QueryCommandInput,
  QueryCommandOutput,
} from "@aws-sdk/client-dynamodb";
import { CreateSessionAttributes } from "../services/session/sessionService";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { NativeAttributeValue, unmarshall } from "@aws-sdk/util-dynamodb";

const sessionStates = {
  ASYNC_AUTH_SESSION_CREATED: "ASYNC_AUTH_SESSION_CREATED",
};

export type DatabaseRecord = Record<string, NativeAttributeValue>;

export class DynamoDbAdapter {
  private readonly tableName: string;
  private readonly dynamoDbClient = new DynamoDBClient({
    region: process.env.REGION,
    maxAttempts: 2,
    requestHandler: new NodeHttpHandler({
      connectionTimeout: 5000,
      requestTimeout: 5000,
    }),
  });

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async getActiveSession(
    subjectIdentifier: string,
    attributesToGet: string[],
  ): Promise<DatabaseRecord | null> {
    const input: QueryCommandInput = {
      TableName: this.tableName,
      IndexName: "subjectIdentifier-timeToLive-index",
      KeyConditionExpression:
        "subjectIdentifier = :subjectIdentifier and :currentTimeInSeconds < timeToLive",
      FilterExpression: "sessionState = :sessionState",
      ExpressionAttributeValues: {
        ":subjectIdentifier": { S: subjectIdentifier },
        ":sessionState": { S: sessionStates.ASYNC_AUTH_SESSION_CREATED },
        ":currentTimeInSeconds": {
          N: this.getTimeNowInSeconds().toString(),
        },
      },
      ProjectionExpression: this.formatAsProjectionExpression(attributesToGet),
      Limit: 1,
      ScanIndexForward: false,
    };

    const queryCommandOutput: QueryCommandOutput =
      await this.dynamoDbClient.send(new QueryCommand(input));

    const items = queryCommandOutput.Items;
    if (!items || items.length === 0) {
      return null;
    }

    return unmarshall(items[0]);
  }

  private formatAsProjectionExpression(attributes: string[]): string {
    return attributes.join(", ");
  }

  async createSession(
    attributes: CreateSessionAttributes,
    sessionId: string,
  ): Promise<void> {
    const {
      client_id,
      govuk_signin_journey_id,
      issuer,
      redirect_uri,
      sessionDurationInSeconds,
      state,
      sub,
    } = attributes;
    const timeToLive = this.getTimeNowInSeconds() + sessionDurationInSeconds;

    const input: PutItemCommandInput = {
      TableName: this.tableName,
      Item: {
        clientId: { S: client_id },
        govukSigninJourneyId: { S: govuk_signin_journey_id },
        createdAt: { N: Date.now().toString() },
        issuer: { S: issuer },
        sessionId: { S: sessionId },
        sessionState: { S: sessionStates.ASYNC_AUTH_SESSION_CREATED },
        clientState: { S: state },
        subjectIdentifier: { S: sub },
        timeToLive: { N: timeToLive.toString() },
        ...(redirect_uri && { redirectUri: { S: redirect_uri } }),
      },
      ConditionExpression: "attribute_not_exists(sessionId)",
    };

    try {
      await this.dynamoDbClient.send(new PutItemCommand(input));
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        throw new Error("Session already exists with this ID");
      } else {
        throw error;
      }
    }
  }

  private getTimeNowInSeconds() {
    return Math.floor(Date.now() / 1000);
  }
}
