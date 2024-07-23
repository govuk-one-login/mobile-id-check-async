import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { SessionService } from "./sessionService";
import { mockClient } from "aws-sdk-client-mock";

describe("Session Service", () => {
  let service: SessionService;
  beforeEach(() => {
    service = new SessionService("mockTableName", "mockIndexName");
  });

  describe("Session recovery", () => {
    describe("Given there is an unexpected error when calling Dynamo DB", () => {
      it("Returns error response", async () => {
        const dbMock = mockClient(DynamoDBClient);
        dbMock.on(QueryCommand).rejects("Mock DB Error");

        const result = await service.getAuthSessionBySub("mockSub", 3600);

        expect(result.isError).toBe(true);
        expect(result.value).toEqual(
          "Unexpected error when querying session table whilst checking for recoverable session",
        );
      });
    });

    describe("Given Items array is missing", () => {
      it("Returns success response will value of null", async () => {
        const dbMock = mockClient(DynamoDBClient);
        dbMock.on(QueryCommand).resolves({});

        const result = await service.getAuthSessionBySub("mockSub", 3600);

        expect(result.isError).toBe(false);
        expect(result.value).toEqual(null);
      });
    });

    describe("Given Items array is empty", () => {
      it("Returns success response will value of null", async () => {
        const dbMock = mockClient(DynamoDBClient);
        dbMock.on(QueryCommand).resolves({ Items: [] });

        const result = await service.getAuthSessionBySub("mockSub", 3600);

        expect(result.isError).toBe(false);
        expect(result.value).toEqual(null);
      });
    });

    describe("Given Items array is missing sessionId", () => {
      it("Returns success response will value of null", async () => {
        const dbMock = mockClient(DynamoDBClient);
        dbMock.on(QueryCommand).resolves({
          Items: [{}],
        });

        const result = await service.getAuthSessionBySub("mockSub", 3600);

        expect(result.isError).toBe(false);
        expect(result.value).toEqual(null);
      });
    });

    describe("Given sessionId value in Items array is empty", () => {
      it("Returns success response will value of null", async () => {
        const dbMock = mockClient(DynamoDBClient);
        dbMock.on(QueryCommand).resolves({
          Items: [
            {
              sessionId: { S: "" },
            },
          ],
        });

        const result = await service.getAuthSessionBySub("mockSub", 3600);

        expect(result.isError).toBe(false);
        expect(result.value).toEqual(null);
      });
    });

    describe("Given a valid recoverable session is found", () => {
      it("Returns a success response with sessionId as value", async () => {
        const dbMock = mockClient(DynamoDBClient);
        dbMock.on(QueryCommand).resolves({
          Items: [
            {
              sessionId: { S: "mockSessionId" },
            },
          ],
        });

        const result = await service.getAuthSessionBySub("mockSub", 3600);

        expect(result.isError).toBe(false);
        expect(result.value).toEqual("mockSessionId");
      });
    });
  });

  describe("Session creation", () => {
    describe("Given there is an unexpected error when checking if sessionId already exists", () => {
      it("Returns error response", async () => {
        const dbMock = mockClient(DynamoDBClient);
        dbMock.on(GetItemCommand).rejects("Mock DB Error");

        const result = await service.createSession({
          sessionId: "137d5a4b-3046-456d-986a-147e0469cf62",
          state: "mockValidState",
          sub: "mockSub",
          clientId: "mockClientId",
          govukSigninJourneyId: "mockJourneyId",
          redirectUri: "https://mockRedirectUri.com",
          issuer: "mockIssuer",
          sessionState: "mockSessionState",
        });

        expect(result.isError).toBe(true);
        expect(result.value).toEqual(
          "Unexpected error when querying session table to check if sessionId exists",
        );
      });
    });

    describe("Given sessionId already exists", () => {
      it("Returns error response", async () => {
        const dbMock = mockClient(DynamoDBClient);
        dbMock.on(GetItemCommand).resolves({
          Item: {
            sessionId: { S: "137d5a4b-3046-456d-986a-147e0469cf62" },
          },
        });

        const result = await service.createSession({
          sessionId: "137d5a4b-3046-456d-986a-147e0469cf62",
          state: "mockValidState",
          sub: "mockSub",
          clientId: "mockClientId",
          govukSigninJourneyId: "mockJourneyId",
          redirectUri: "https://mockRedirectUri.com",
          issuer: "mockIssuer",
          sessionState: "mockSessionState",
        });

        expect(result.isError).toBe(true);
        expect(result.value).toEqual(
          "sessionId already exists in the database",
        );
      });
    });

    describe("Given there is an unexpected error when creating session", () => {
      it("Returns error response", async () => {
        const dbMock = mockClient(DynamoDBClient);
        dbMock.on(GetItemCommand).resolves({});
        dbMock.on(PutItemCommand).rejects("Mock DB Error");

        const result = await service.createSession({
          sessionId: "137d5a4b-3046-456d-986a-147e0469cf62",
          state: "mockValidState",
          sub: "mockSub",
          clientId: "mockClientId",
          govukSigninJourneyId: "mockJourneyId",
          redirectUri: "https://mockRedirectUri.com",
          issuer: "mockIssuer",
          sessionState: "mockSessionState",
        });

        expect(result.isError).toBe(true);
        expect(result.value).toEqual(
          "Unexpected error when querying session table whilst creating a session",
        );
      });
    });

    describe("Given creating a session is successful", () => {
      describe("Given redirect_uri not present", () => {
        it("Returns success response", async () => {
          const dbMock = mockClient(DynamoDBClient);
          dbMock.on(GetItemCommand).resolves({});
          dbMock.on(PutItemCommand).resolves({});

          const result = await service.createSession({
            sessionId: "137d5a4b-3046-456d-986a-147e0469cf62",
            state: "mockValidState",
            sub: "mockSub",
            clientId: "mockClientId",
            govukSigninJourneyId: "mockJourneyId",
            issuer: "mockIssuer",
            sessionState: "mockSessionState",
          });

          expect(result.isError).toBe(false);
          expect(result.value).toEqual(null);
        });
      });

      describe("Given redirect_uri is present", () => {
        it("Returns success response", async () => {
          const dbMock = mockClient(DynamoDBClient);
          dbMock.on(GetItemCommand).resolves({});
          dbMock.on(PutItemCommand).resolves({});

          const result = await service.createSession({
            sessionId: "137d5a4b-3046-456d-986a-147e0469cf62",
            state: "mockValidState",
            sub: "mockSub",
            clientId: "mockClientId",
            govukSigninJourneyId: "mockJourneyId",
            redirectUri: "https://mockRedirectUri.com",
            issuer: "mockIssuer",
            sessionState: "mockSessionState",
          });

          expect(result.isError).toBe(false);
          expect(result.value).toEqual(null);
        });
      });
    });
  });
});
