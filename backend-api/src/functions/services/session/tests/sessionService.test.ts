import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  DynamoDBClientResolvedConfig,
  PutItemCommand,
  PutItemCommandInput,
  QueryCommand,
  QueryCommandInput,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "@aws-sdk/client-dynamodb";
import { AwsStub, mockClient } from "aws-sdk-client-mock";
import { ISessionService, SessionService } from "../sessionService";
import "aws-sdk-client-mock-jest";

describe("Session Service", () => {
  let sessionService: ISessionService;
  let dynamoDbMockClient: AwsStub<
    ServiceInputTypes,
    ServiceOutputTypes,
    DynamoDBClientResolvedConfig
  >;

  beforeEach(() => {
    sessionService = new SessionService("mockTableName");
    dynamoDbMockClient = mockClient(DynamoDBClient);
  });

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date("2024-03-10"));
  });

  describe("Get active session ID", () => {
    describe("Given an error happens when fetching an active session from the table", () => {
      it("Returns an error response", async () => {
        dynamoDbMockClient.on(QueryCommand).rejectsOnce("Mock DB Error");
        const result = await sessionService.getActiveSessionId("mockSub");

        expect(result.value).toStrictEqual({
          errorMessage: "Error getting session ID - Error: Mock DB Error",
          errorCategory: "SERVER_ERROR",
        });
        expect(result.isError).toBe(true);
      });
    });

    describe("Given the query response does not contain the Items field", () => {
      it("Returns success response with value of null", async () => {
        dynamoDbMockClient.on(QueryCommand).resolvesOnce({});
        const result = await sessionService.getActiveSessionId("mockSub");

        expect(result.isError).toBe(false);
        expect(result.value).toEqual(null);
      });
    });

    describe("Given the query response does not return any items", () => {
      it("Returns success response with value of null", async () => {
        dynamoDbMockClient.on(QueryCommand).resolvesOnce({ Items: [] });
        const result = await sessionService.getActiveSessionId("mockSub");

        expect(result.isError).toBe(false);
        expect(result.value).toEqual(null);
      });
    });

    describe("Given the item returned is missing the attribute sessionId", () => {
      it("Returns an error response", async () => {
        dynamoDbMockClient
          .on(QueryCommand)
          .resolvesOnce({ Items: [{ dummyKey: { S: "dummyValue" } }] });
        const result = await sessionService.getActiveSessionId("mockSub");

        expect(result.isError).toBe(true);
        expect(result.value).toEqual({
          errorCategory: "SERVER_ERROR",
          errorMessage: "Session is malformed",
        });
      });
    });

    describe("Given the session ID of an active session is found", () => {
      it("Returns a success response with the session ID as value", async () => {
        dynamoDbMockClient.on(QueryCommand).resolves({
          Items: [
            {
              sessionId: { S: "mockSessionId" },
            },
          ],
        });
        const result = await sessionService.getActiveSessionId("mockSub");

        expect(result.isError).toBe(false);
        expect(result.value).toEqual("mockSessionId");
        const expectedCommandInput: QueryCommandInput = {
          ExpressionAttributeValues: {
            ":currentTimeInSeconds": { N: "1710028800" }, // jest.useFakeTimers().setSystemTime(new Date("2024-03-10"))
            ":sessionState": { S: "ASYNC_AUTH_SESSION_CREATED" },
            ":subjectIdentifier": { S: "mockSub" },
          },
          FilterExpression: "sessionState = :sessionState",
          IndexName: "subjectIdentifier-timeToLive-index",
          KeyConditionExpression:
            "subjectIdentifier = :subjectIdentifier and :currentTimeInSeconds < timeToLive",
          Limit: 1,
          ProjectionExpression: "sessionId",
          ScanIndexForward: false,
          TableName: "mockTableName",
        };
        expect(dynamoDbMockClient).toHaveReceivedCommandWith(
          QueryCommand,
          expectedCommandInput,
        );
      });
    });
  });

  describe("Get active session details", () => {
    describe("Given an error happens when fetching an active session from the table", () => {
      it("Returns an error response", async () => {
        dynamoDbMockClient.on(QueryCommand).rejectsOnce("Mock DB Error");
        const result = await sessionService.getActiveSession("mockSub");

        expect(result.value).toStrictEqual({
          errorMessage: "Error getting session - Error: Mock DB Error",
          errorCategory: "SERVER_ERROR",
        });
        expect(result.isError).toBe(true);
      });
    });

    describe("Given the query response does not contain the Items field", () => {
      it("Returns success response with value of null", async () => {
        dynamoDbMockClient.on(QueryCommand).resolvesOnce({});
        const result = await sessionService.getActiveSession("mockSub");

        expect(result.isError).toBe(false);
        expect(result.value).toEqual(null);
      });
    });

    describe("Given the query response does not return any items", () => {
      it("Returns success response with value of null", async () => {
        dynamoDbMockClient.on(QueryCommand).resolvesOnce({ Items: [] });
        const result = await sessionService.getActiveSession("mockSub");

        expect(result.isError).toBe(false);
        expect(result.value).toEqual(null);
      });
    });

    describe("Given the item returned is missing the attribute sessionId", () => {
      it("Returns an error response", async () => {
        dynamoDbMockClient
          .on(QueryCommand)
          .resolvesOnce({ Items: [{ dummyKey: { S: "dummyValue" } }] });
        const result = await sessionService.getActiveSession("mockSub");

        expect(result.isError).toBe(true);
        expect(result.value).toEqual({
          errorCategory: "SERVER_ERROR",
          errorMessage: "Session is malformed",
        });
      });
    });

    describe("Given the item returned is missing the attribute clientState", () => {
      it("Returns an error response", async () => {
        dynamoDbMockClient
          .on(QueryCommand)
          .resolvesOnce({ Items: [{ sessionId: { S: "mockSessionId" } }] });
        const result = await sessionService.getActiveSession("mockSub");

        expect(result.isError).toBe(true);
        expect(result.value).toEqual({
          errorCategory: "SERVER_ERROR",
          errorMessage: "Session is malformed",
        });
      });
    });

    describe("Given the item returned does not have the attribute redirectUri", () => {
      it("Returns a success response with the session ID and state as value", async () => {
        dynamoDbMockClient.on(QueryCommand).resolvesOnce({
          Items: [
            {
              sessionId: { S: "mockSessionId" },
              clientState: { S: "mockClientState" },
            },
          ],
        });
        const result = await sessionService.getActiveSession("mockSub");

        expect(result.isError).toBe(false);
        expect(result.value).toEqual({
          sessionId: "mockSessionId",
          state: "mockClientState",
        });
      });
    });

    describe("Given the item returned has the attribute redirectUri", () => {
      it("Returns a success response with the session ID, state and redirectUri as value", async () => {
        dynamoDbMockClient.on(QueryCommand).resolvesOnce({
          Items: [
            {
              sessionId: { S: "mockSessionId" },
              clientState: { S: "mockClientSate" },
              redirectUri: { S: "mockRedirectUri" },
            },
          ],
        });
        const result = await sessionService.getActiveSession("mockSub");

        expect(result.isError).toBe(false);
        expect(result.value).toStrictEqual({
          sessionId: "mockSessionId",
          state: "mockClientSate",
          redirectUri: "mockRedirectUri",
        });
        const expectedCommandInput: QueryCommandInput = {
          ExpressionAttributeValues: {
            ":currentTimeInSeconds": { N: "1710028800" }, // jest.useFakeTimers().setSystemTime(new Date("2024-03-10"))
            ":sessionState": { S: "ASYNC_AUTH_SESSION_CREATED" },
            ":subjectIdentifier": { S: "mockSub" },
          },
          FilterExpression: "sessionState = :sessionState",
          IndexName: "subjectIdentifier-timeToLive-index",
          KeyConditionExpression:
            "subjectIdentifier = :subjectIdentifier and :currentTimeInSeconds < timeToLive",
          Limit: 1,
          ProjectionExpression: "sessionId, clientState, redirectUri",
          ScanIndexForward: false,
          TableName: "mockTableName",
        };
        expect(dynamoDbMockClient).toHaveReceivedCommandWith(
          QueryCommand,
          expectedCommandInput,
        );
      });
    });
  });

  describe("Creates a session", () => {
    describe("Given there is an unexpected error when creating a session", () => {
      it("Returns error response", async () => {
        dynamoDbMockClient.on(PutItemCommand).rejectsOnce("Mock DB Error");
        const result = await sessionService.createSession({
          state: "mockValidState",
          sub: "mockSub",
          client_id: "mockClientId",
          govuk_signin_journey_id: "mockJourneyId",
          redirect_uri: "https://mockRedirectUri.com",
          issuer: "mockIssuer",
          sessionDurationInSeconds: 3600,
        });

        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Error creating session - Error: Mock DB Error",
          errorCategory: "SERVER_ERROR",
        });
      });
    });

    describe("Given a session with the same session ID already exists", () => {
      it("Returns error response", async () => {
        const mockError = new ConditionalCheckFailedException({
          $metadata: {},
          message: "Conditional check failed",
        });
        dynamoDbMockClient.on(PutItemCommand).rejectsOnce(mockError);
        const result = await sessionService.createSession({
          state: "mockValidState",
          sub: "mockSub",
          client_id: "mockClientId",
          govuk_signin_journey_id: "mockJourneyId",
          sessionDurationInSeconds: 12345,
          redirect_uri: "https://mockRedirectUri.com",
          issuer: "mockIssuer",
        });

        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage:
            "Error creating session - Error: Session already exists with this ID",
          errorCategory: "SERVER_ERROR",
        });
      });
    });

    describe("Given creating a session is successful", () => {
      describe("When the function input does not contain the key redirect_uri", () => {
        it("Does not include redirectUri in the session", async () => {
          dynamoDbMockClient.on(PutItemCommand).resolvesOnce({});
          const result = await sessionService.createSession({
            state: "mockValidState",
            sub: "mockSub",
            client_id: "mockClientId",
            govuk_signin_journey_id: "mockJourneyId",
            issuer: "mockIssuer",
            sessionDurationInSeconds: 12345,
          });

          expect(result.isError).toBe(false);
          expect(result.value).toEqual(expect.any(String));
          const expectedCommandInput: PutItemCommandInput = {
            ConditionExpression: "attribute_not_exists(sessionId)",
            Item: {
              clientId: { S: "mockClientId" },
              clientState: { S: "mockValidState" },
              createdAt: { N: "1710028800000" }, // jest.useFakeTimers().setSystemTime(new Date("2024-03-10"))
              govukSigninJourneyId: { S: "mockJourneyId" },
              issuer: { S: "mockIssuer" },
              sessionId: { S: expect.any(String) },
              sessionState: { S: "ASYNC_AUTH_SESSION_CREATED" },
              subjectIdentifier: { S: "mockSub" },
              timeToLive: { N: "1710041145" }, // jest.useFakeTimers().setSystemTime(new Date("2024-03-10"))
            },
            TableName: "mockTableName",
          };
          expect(dynamoDbMockClient).toHaveReceivedCommandWith(
            PutItemCommand,
            expectedCommandInput,
          );
        });
      });

      describe("When the function input contains the key redirect_uri", () => {
        it("Includes redirectUri in the session", async () => {
          dynamoDbMockClient.on(PutItemCommand).resolvesOnce({});
          const result = await sessionService.createSession({
            state: "mockValidState",
            sub: "mockSub",
            client_id: "mockClientId",
            govuk_signin_journey_id: "mockJourneyId",
            redirect_uri: "https://mockRedirectUri.com",
            issuer: "mockIssuer",
            sessionDurationInSeconds: 12345,
          });

          expect(result.isError).toBe(false);
          expect(result.value).toEqual(expect.any(String));
          const expectedCommandInput: PutItemCommandInput = {
            ConditionExpression: "attribute_not_exists(sessionId)",
            Item: {
              clientId: { S: "mockClientId" },
              clientState: { S: "mockValidState" },
              createdAt: { N: "1710028800000" }, // jest.useFakeTimers().setSystemTime(new Date("2024-03-10"))
              govukSigninJourneyId: { S: "mockJourneyId" },
              issuer: { S: "mockIssuer" },
              redirectUri: { S: "https://mockRedirectUri.com" },
              sessionId: { S: expect.any(String) },
              sessionState: { S: "ASYNC_AUTH_SESSION_CREATED" },
              subjectIdentifier: { S: "mockSub" },
              timeToLive: { N: "1710041145" }, // jest.useFakeTimers().setSystemTime(new Date("2024-03-10"))
            },
            TableName: "mockTableName",
          };
          expect(dynamoDbMockClient).toHaveReceivedCommandWith(
            PutItemCommand,
            expectedCommandInput,
          );
        });
      });
    });
  });
});
