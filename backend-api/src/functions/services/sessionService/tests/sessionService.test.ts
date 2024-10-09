import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  DynamoDBClientResolvedConfig,
  PutItemCommand,
  QueryCommand,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "@aws-sdk/client-dynamodb";
import { AwsStub, mockClient } from "aws-sdk-client-mock";
import { ISessionService, SessionService } from "../sessionService";

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
          errorMessage: "Unexpected error when querying database",
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

    describe("Given an active session is found", () => {
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
      });
    });
  });

  describe("Get active session details", () => {
    describe("Given an error happens when fetching an active session from the table", () => {
      it("Returns an error response", async () => {
        dynamoDbMockClient.on(QueryCommand).rejectsOnce("Mock DB Error");

        const result = await sessionService.getActiveSessionDetails("mockSub");

        expect(result.value).toStrictEqual({
          errorMessage: "Unexpected error when querying database",
          errorCategory: "SERVER_ERROR",
        });
        expect(result.isError).toBe(true);
      });
    });

    describe("Given the query response does not contain the Items field", () => {
      it("Returns success response with value of null", async () => {
        dynamoDbMockClient.on(QueryCommand).resolvesOnce({});

        const result = await sessionService.getActiveSessionDetails("mockSub");

        expect(result.isError).toBe(false);
        expect(result.value).toEqual(null);
      });
    });

    describe("Given the query response does not return any items", () => {
      it("Returns success response with value of null", async () => {
        dynamoDbMockClient.on(QueryCommand).resolvesOnce({ Items: [] });

        const result = await sessionService.getActiveSessionDetails("mockSub");

        expect(result.isError).toBe(false);
        expect(result.value).toEqual(null);
      });
    });

    describe("Given the item returned is missing the attribute sessionId", () => {
      it("Returns an error response", async () => {
        dynamoDbMockClient
          .on(QueryCommand)
          .resolvesOnce({ Items: [{ dummyKey: { S: "dummyValue" } }] });

        const result = await sessionService.getActiveSessionDetails("mockSub");

        expect(result.isError).toBe(true);
        expect(result.value).toEqual({
          errorCategory: "SERVER_ERROR",
          errorMessage: "Session is malformed",
        });
      });
    });

    describe("Given the item returned is missing the attribute state", () => {
      it("Returns an error response", async () => {
        dynamoDbMockClient
          .on(QueryCommand)
          .resolvesOnce({ Items: [{ sessionId: { S: "mockSessionId" } }] });

        const result = await sessionService.getActiveSessionDetails("mockSub");

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
            { sessionId: { S: "mockSessionId" }, state: { S: "mockState" } },
          ],
        });

        const result = await sessionService.getActiveSessionDetails("mockSub");

        expect(result.isError).toBe(false);
        expect(result.value).toEqual({
          sessionId: "mockSessionId",
          state: "mockState",
        });
      });
    });

    describe("Given the item returned has the attribute redirectUri", () => {
      it("Returns a success response with the session ID, state and redirectUri as value", async () => {
        dynamoDbMockClient.on(QueryCommand).resolvesOnce({
          Items: [
            {
              sessionId: { S: "mockSessionId" },
              state: { S: "mockState" },
              redirectUri: { S: "redirectUri" },
            },
          ],
        });

        const result = await sessionService.getActiveSessionDetails("mockSub");

        expect(result.isError).toBe(false);
        expect(result.value).toStrictEqual({
          sessionId: "mockSessionId",
          state: "mockState",
          redirectUri: "redirectUri",
        });
      });
    });
  });

  describe("Create sa ession", () => {
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
          errorMessage: "Unexpected error while creating a new session",
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
          errorMessage: "Session already exists with this ID",
          errorCategory: "SERVER_ERROR",
        });
      });
    });

    describe("Given creating a session is successful", () => {
      describe("Given the function input does not contain the key redirect_uri", () => {
        it("Returns success response", async () => {
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
        });
      });

      describe("Given the function input contains the key redirect_uri", () => {
        it("Returns success response", async () => {
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
        });
      });
    });
  });
});
