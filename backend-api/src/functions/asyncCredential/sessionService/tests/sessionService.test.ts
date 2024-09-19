import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { SessionService } from "../sessionService";

describe("Session Service", () => {
  let service: SessionService;
  beforeEach(() => {
    service = new SessionService("mockTableName");
  });

  describe("Get active session", () => {
    describe("Given there is an unexpected error when calling Dynamo DB", () => {
      it("Returns error response", async () => {
        const dbMock = mockClient(DynamoDBClient);
        dbMock.on(QueryCommand).rejects("Mock DB Error");

        const result = await service.getActiveSession("mockSub");

        expect(result.value).toStrictEqual({
          errorMessage:
            "Unexpected error when querying session table whilst checking for an active session",
          errorCategory: "SERVER_ERROR",
        });

        expect(result.isError).toBe(true);
      });
    });

    describe("Given Items array is missing", () => {
      it("Returns success response will value of null", async () => {
        const dbMock = mockClient(DynamoDBClient);
        dbMock.on(QueryCommand).resolves({});

        const result = await service.getActiveSession("mockSub");

        expect(result.isError).toBe(false);
        expect(result.value).toEqual(null);
      });
    });

    describe("Given Items array is empty", () => {
      it("Returns success response will value of null", async () => {
        const dbMock = mockClient(DynamoDBClient);
        dbMock.on(QueryCommand).resolves({ Items: [] });

        const result = await service.getActiveSession("mockSub");

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

        const result = await service.getActiveSession("mockSub");

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

        const result = await service.getActiveSession("mockSub");

        expect(result.isError).toBe(false);
        expect(result.value).toBe(null);
      });
    });

    describe("Given an active session is found", () => {
      it("Returns a success response with sessionId as value", async () => {
        const dbMock = mockClient(DynamoDBClient);
        dbMock.on(QueryCommand).resolves({
          Items: [
            {
              sessionId: { S: "mockSessionId" },
            },
          ],
        });

        const result = await service.getActiveSession("mockSub");

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
          state: "mockValidState",
          sub: "mockSub",
          client_id: "mockClientId",
          govuk_signin_journey_id: "mockJourneyId",
          redirect_uri: "https://mockRedirectUri.com",
          issuer: "mockIssuer",
          sessionDurationInSeconds: 12345,
        });

        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage:
            "Unexpected error when querying session table to check if sessionId exists",
          errorCategory: "SERVER_ERROR",
        });
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
          errorMessage: "sessionId already exists in the database",
          errorCategory: "SERVER_ERROR",
        });
      });
    });

    describe("Given there is an unexpected error when creating session", () => {
      it("Returns error response", async () => {
        const dbMock = mockClient(DynamoDBClient);
        dbMock.on(GetItemCommand).resolves({});
        dbMock.on(PutItemCommand).rejects("Mock DB Error");

        const result = await service.createSession({
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
            "Unexpected error when querying session table whilst creating a session",
          errorCategory: "SERVER_ERROR",
        });
      });
    });

    describe("Given creating a session is successful", () => {
      describe("Given redirect_uri not present", () => {
        it("Returns success response", async () => {
          const dbMock = mockClient(DynamoDBClient);
          dbMock.on(GetItemCommand).resolves({});
          dbMock.on(PutItemCommand).resolves({});

          const result = await service.createSession({
            state: "mockValidState",
            sub: "mockSub",
            client_id: "mockClientId",
            govuk_signin_journey_id: "mockJourneyId",
            issuer: "mockIssuer",
            sessionDurationInSeconds: 12345,
          });

          expect(result.isError).toBe(false);
          expect(typeof result.value).toBe("string");
        });
      });

      describe("Given redirect_uri is present", () => {
        it("Returns success response", async () => {
          const dbMock = mockClient(DynamoDBClient);
          dbMock.on(GetItemCommand).resolves({});
          dbMock.on(PutItemCommand).resolves({});

          const result = await service.createSession({
            state: "mockValidState",
            sub: "mockSub",
            client_id: "mockClientId",
            govuk_signin_journey_id: "mockJourneyId",
            redirect_uri: "https://mockRedirectUri.com",
            issuer: "mockIssuer",
            sessionDurationInSeconds: 12345,
          });

          expect(result.isError).toBe(false);
          expect(typeof result.value).toBe("string");
        });
      });
    });
  });
});
