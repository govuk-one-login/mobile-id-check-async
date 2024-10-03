import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDbSessionRepository } from "../dynamoDbSessionRepository";

describe("DynamoDB Session Repository", () => {
  let dynamoDbSessionRepository: DynamoDbSessionRepository;
  beforeEach(() => {
    dynamoDbSessionRepository = new DynamoDbSessionRepository("mockTableName");
  });

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date("2024-03-10"));
  });

  describe("Get active session", () => {
    describe("Given there is an unexpected error when fetching a session from the table", () => {
      it("Returns an error response", async () => {
        const dbMock = mockClient(DynamoDBClient);
        dbMock.on(QueryCommand).rejects("Mock DB Error");

        const result = await dynamoDbSessionRepository.read("mockSub");

        expect(result.value).toStrictEqual({
          errorMessage:
            "Unexpected error when querying database for an active session",
          errorCategory: "SERVER_ERROR",
        });
        expect(result.isError).toBe(true);
      });
    });

    describe("Given the query response does not contain the field Items", () => {
      it("Returns success response will value of null", async () => {
        const dbMock = mockClient(DynamoDBClient);
        dbMock.on(QueryCommand).resolves({});

        const result = await dynamoDbSessionRepository.read("mockSub");

        expect(result.isError).toBe(false);
        expect(result.value).toEqual(null);
      });
    });

    describe("Given the query does not return any items", () => {
      it("Returns success response will value of null", async () => {
        const dbMock = mockClient(DynamoDBClient);
        dbMock.on(QueryCommand).resolves({ Items: [] });

        const result = await dynamoDbSessionRepository.read("mockSub");

        expect(result.isError).toBe(false);
        expect(result.value).toEqual(null);
      });
    });

    describe("Given an active session is found", () => {
      it("Returns a success response with the session item as value", async () => {
        const dbMock = mockClient(DynamoDBClient);
        dbMock.on(QueryCommand).resolves({
          Items: [
            {
              clientId: { S: "mockClientId" },
              govukSigninJourneyId: { S: "govukSigninJourneyId" },
              createdAt: { N: "1710032400" },
              issuer: { S: "mockIssuer" },
              sessionId: { S: "mockSessionId" },
              sessionState: { S: "ASYNC_AUTH_SESSION_CREATED" },
              state: { S: "mockState" },
              subjectIdentifier: { S: "sub" },
              timeToLive: { N: "1710028800000" },
            },
          ],
        });

        const result = await dynamoDbSessionRepository.read("mockSub");

        expect(result.isError).toBe(false);
        expect(result.value).toEqual({
          clientId: "mockClientId",
          govukSigninJourneyId: "govukSigninJourneyId",
          createdAt: 1710032400,
          issuer: "mockIssuer",
          sessionId: "mockSessionId",
          sessionState: "ASYNC_AUTH_SESSION_CREATED",
          state: "mockState",
          subjectIdentifier: "sub",
          timeToLive: 1710028800000,
        });
      });
    });
  });

  describe("Session creation", () => {
    describe("Given there is an unexpected error when creating session", () => {
      it("Returns error response", async () => {
        const dbMock = mockClient(DynamoDBClient);
        dbMock.on(PutItemCommand).rejects("Mock DB Error");

        const result = await dynamoDbSessionRepository.create({
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
          errorMessage: "Unexpected error while creating a new session",
          errorCategory: "SERVER_ERROR",
        });
      });
    });

    describe("Given sessionId already exists", () => {
      it("Returns error response", async () => {
        const dbMock = mockClient(DynamoDBClient);
        const mockError = new ConditionalCheckFailedException({
          $metadata: {},
          message: "Some mock error message",
        });
        dbMock.on(PutItemCommand).rejects(mockError);

        const result = await dynamoDbSessionRepository.create({
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
          errorMessage: "Session already exists with this ID",
          errorCategory: "SERVER_ERROR",
        });
      });
    });

    describe("Given creating a session is successful", () => {
      describe("Given 'redirect_uri' is not present", () => {
        it("Returns success response", async () => {
          const dynamoDbMock = mockClient(DynamoDBClient);
          dynamoDbMock.on(PutItemCommand).resolves({});

          const result = await dynamoDbSessionRepository.create({
            state: "mockValidState",
            sub: "mockSub",
            client_id: "mockClientId",
            govuk_signin_journey_id: "mockJourneyId",
            issuer: "mockIssuer",
            sessionDurationInSeconds: 12345,
          });

          expect(result.isError).toBe(false);
          expect(result.value).toEqual(expect.any(String));
        });
      });

      describe("Given 'redirect_uri' is present", () => {
        it("Returns success response", async () => {
          const dbMock = mockClient(DynamoDBClient);
          dbMock.on(PutItemCommand).resolves({});

          const result = await dynamoDbSessionRepository.create({
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
        });
      });
    });
  });
});
