import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDbAdapter } from "../dynamoDbAdapter";

describe("DynamoDB Session Repository", () => {
  let dynamoDbSessionRepository: DynamoDbAdapter;
  const dynamoDbMockClient = mockClient(DynamoDBClient);

  beforeEach(() => {
    dynamoDbSessionRepository = new DynamoDbAdapter("mockTableName");
  });

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date("2024-03-10"));
  });

  describe("Get active session ID", () => {
    describe("Given an error happens when fetching an active session from the table", () => {
      it("Returns an error response", async () => {
        dynamoDbMockClient.on(QueryCommand).rejectsOnce("Mock DB Error");

        const result = await dynamoDbSessionRepository.readSessionId("mockSub");

        expect(result.value).toStrictEqual({
          errorMessage:
            "Unexpected error when querying database to get an active session's ID",
          errorCategory: "SERVER_ERROR",
        });
        expect(result.isError).toBe(true);
      });
    });

    describe("Given the query response does not contain the field Items", () => {
      it("Returns success response will value of null", async () => {
        dynamoDbMockClient.on(QueryCommand).resolvesOnce({});

        const result = await dynamoDbSessionRepository.readSessionId("mockSub");

        expect(result.isError).toBe(false);
        expect(result.value).toEqual(null);
      });
    });

    describe("Given the query response does not return any items", () => {
      it("Returns success response will value of null", async () => {
        dynamoDbMockClient.on(QueryCommand).resolvesOnce({ Items: [] });

        const result = await dynamoDbSessionRepository.readSessionId("mockSub");

        expect(result.isError).toBe(false);
        expect(result.value).toEqual(null);
      });
    });

    describe("Given the item returned is missing the attribute sessionId", () => {
      it("Returns an error response", async () => {
        dynamoDbMockClient
          .on(QueryCommand)
          .resolvesOnce({ Items: [{ dummyKey: { S: "dummyValue" } }] });

        const result = await dynamoDbSessionRepository.readSessionId("mockSub");

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

        const result = await dynamoDbSessionRepository.readSessionId("mockSub");

        expect(result.isError).toBe(false);
        expect(result.value).toEqual("mockSessionId");
      });
    });
  });

  describe("Get active session details", () => {
    describe("Given an error happens when fetching an active session from the table", () => {
      it("Returns an error response", async () => {
        dynamoDbMockClient.on(QueryCommand).rejectsOnce("Mock DB Error");

        const result =
          await dynamoDbSessionRepository.readSessionDetails("mockSub");

        expect(result.value).toStrictEqual({
          errorMessage:
            "Unexpected error when querying database to get an active session's details",
          errorCategory: "SERVER_ERROR",
        });
        expect(result.isError).toBe(true);
      });
    });

    describe("Given the query response does not contain the field Items", () => {
      it("Returns success response will value of null", async () => {
        dynamoDbMockClient.on(QueryCommand).resolvesOnce({});

        const result =
          await dynamoDbSessionRepository.readSessionDetails("mockSub");

        expect(result.isError).toBe(false);
        expect(result.value).toEqual(null);
      });
    });

    describe("Given the query response does not return any items", () => {
      it("Returns success response will value of null", async () => {
        dynamoDbMockClient.on(QueryCommand).resolvesOnce({ Items: [] });

        const result =
          await dynamoDbSessionRepository.readSessionDetails("mockSub");

        expect(result.isError).toBe(false);
        expect(result.value).toEqual(null);
      });
    });

    describe("Given the item returned is missing the attribute sessionId", () => {
      it("Returns an error response", async () => {
        dynamoDbMockClient
          .on(QueryCommand)
          .resolvesOnce({ Items: [{ dummyKey: { S: "dummyValue" } }] });

        const result =
          await dynamoDbSessionRepository.readSessionDetails("mockSub");

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

        const result =
          await dynamoDbSessionRepository.readSessionDetails("mockSub");

        expect(result.isError).toBe(true);
        expect(result.value).toEqual({
          errorCategory: "SERVER_ERROR",
          errorMessage: "Session is malformed",
        });
      });
    });

    describe("Given the item returned does not have the attribute redirectUri", () => {
      it("Returns a success response with the session ID and state as value", async () => {
        dynamoDbMockClient
          .on(QueryCommand)
          .resolvesOnce({
            Items: [
              { sessionId: { S: "mockSessionId" }, state: { S: "mockState" } },
            ],
          });

        const result =
          await dynamoDbSessionRepository.readSessionDetails("mockSub");

        expect(result.isError).toBe(false);
        expect(result.value).toEqual({
          sessionId: "mockSessionId",
          state: "mockState",
        });
      });
    });

    describe("Given the item returned has the attribute redirectUri", () => {
      it("Returns a success response with the session ID, state and redirectUri as value", async () => {
        dynamoDbMockClient
          .on(QueryCommand)
          .resolvesOnce({
            Items: [
              {
                sessionId: { S: "mockSessionId" },
                state: { S: "mockState" },
                redirectUri: { S: "redirectUri" },
              },
            ],
          });

        const result =
          await dynamoDbSessionRepository.readSessionDetails("mockSub");

        expect(result.isError).toBe(false);
        expect(result.value).toStrictEqual({
          sessionId: "mockSessionId",
          state: "mockState",
          redirectUri: "redirectUri",
        });
      });
    });
  });

  describe("Session creation", () => {
    //   describe("Given there is an unexpected error when creating session", () => {
    //     it("Returns error response", async () => {
    //       const dbMock = mockClient(DynamoDBClient);
    //       dbMock.on(PutItemCommand).rejects("Mock DB Error");
    //
    //       const result = await dynamoDbSessionRepository.create({
    //         state: "mockValidState",
    //         sub: "mockSub",
    //         client_id: "mockClientId",
    //         govuk_signin_journey_id: "mockJourneyId",
    //         redirect_uri: "https://mockRedirectUri.com",
    //         issuer: "mockIssuer",
    //         sessionDurationInSeconds: 3600,
    //       });
    //
    //       expect(result.isError).toBe(true);
    //       expect(result.value).toStrictEqual({
    //         errorMessage: "Unexpected error while creating a new session",
    //         errorCategory: "SERVER_ERROR",
    //       });
    //     });
    //   });
    // describe("Given sessionId already exists", () => {
    //   it("Returns error response", async () => {
    //     const dbMock = mockClient(DynamoDBClient);
    //     const mockError = new ConditionalCheckFailedException({
    //       $metadata: {},
    //       message: "Some mock error message",
    //     });
    //     dbMock.on(PutItemCommand).rejects(mockError);
    //
    //     const result = await dynamoDbSessionRepository.create({
    //       state: "mockValidState",
    //       sub: "mockSub",
    //       client_id: "mockClientId",
    //       govuk_signin_journey_id: "mockJourneyId",
    //       sessionDurationInSeconds: 12345,
    //       redirect_uri: "https://mockRedirectUri.com",
    //       issuer: "mockIssuer",
    //     });
    //
    //     expect(result.isError).toBe(true);
    //     expect(result.value).toStrictEqual({
    //       errorMessage: "Session already exists with this ID",
    //       errorCategory: "SERVER_ERROR",
    //     });
    //   });
    // });
    // describe("Given creating a session is successful", () => {
    //   describe("Given 'redirect_uri' is not present", () => {
    //     it("Returns success response", async () => {
    //       const dynamoDbMock = mockClient(DynamoDBClient);
    //       dynamoDbMock.on(PutItemCommand).resolves({});
    //
    //       const result = await dynamoDbSessionRepository.create({
    //         state: "mockValidState",
    //         sub: "mockSub",
    //         client_id: "mockClientId",
    //         govuk_signin_journey_id: "mockJourneyId",
    //         issuer: "mockIssuer",
    //         sessionDurationInSeconds: 12345,
    //       });
    //
    //       expect(result.isError).toBe(false);
    //       expect(result.value).toEqual(expect.any(String));
    //     });
    //   });
    // describe("Given 'redirect_uri' is present", () => {
    //   it("Returns success response", async () => {
    //     const dbMock = mockClient(DynamoDBClient);
    //     dbMock.on(PutItemCommand).resolves({});
    //
    //     const result = await dynamoDbSessionRepository.create({
    //       state: "mockValidState",
    //       sub: "mockSub",
    //       client_id: "mockClientId",
    //       govuk_signin_journey_id: "mockJourneyId",
    //       redirect_uri: "https://mockRedirectUri.com",
    //       issuer: "mockIssuer",
    //       sessionDurationInSeconds: 12345,
    //     });
    //
    //     expect(result.isError).toBe(false);
    //     expect(result.value).toEqual(expect.any(String));
    //   });
    // });
    // });
  });
});
