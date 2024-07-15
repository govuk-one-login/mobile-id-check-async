import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { recoverSessionService } from "./recoverSessionService";
import { mockClient } from "aws-sdk-client-mock";

describe("Recover Session Service", () => {
  describe("Given there is an unexpected error when calling Dynamo DB", () => {
    it("Returns error response", async () => {
      const service = new recoverSessionService(
        "mockTableName",
        "mockIndexName",
      );
      const dbMock = mockClient(DynamoDBClient);
      dbMock.on(QueryCommand).rejects("Mock DB Error");

      const result = await service.getAuthSessionBySub(
        "mockSub",
        "mockValidState",
        3600,
      );

      expect(result.isError).toBe(true);
      expect(result.value).toEqual(
        "Unexpected error when querying session table whilst checking for recoverable session",
      );
    });
  });

  describe("Given Items array is missing", () => {
    it("Returns success response will value of null", async () => {
      const service = new recoverSessionService(
        "mockTableName",
        "mockIndexName",
      );
      const dbMock = mockClient(DynamoDBClient);
      dbMock.on(QueryCommand).resolves({});

      const result = await service.getAuthSessionBySub(
        "mockSub",
        "mockValidState",
        3600,
      );

      expect(result.isError).toBe(false);
      expect(result.value).toEqual(null);
    });
  });

  describe("Given Items array is empty", () => {
    it("Returns success response will value of null", async () => {
      const service = new recoverSessionService(
        "mockTableName",
        "mockIndexName",
      );
      const dbMock = mockClient(DynamoDBClient);
      dbMock.on(QueryCommand).resolves({ Items: [] });

      const result = await service.getAuthSessionBySub(
        "mockSub",
        "mockValidState",
        3600,
      );

      expect(result.isError).toBe(false);
      expect(result.value).toEqual(null);
    });
  });

  describe("Given Items array is missing sessionId", () => {
    it("Returns success response will value of null", async () => {
      const service = new recoverSessionService(
        "mockTableName",
        "mockIndexName",
      );

      const dbMock = mockClient(DynamoDBClient);
      dbMock.on(QueryCommand).resolves({
        Items: [
          {
            sub: { S: "mockSub" },
            state: { S: "mockValidState" },
          },
        ],
      });

      const result = await service.getAuthSessionBySub(
        "mockSub",
        "mockState",
        3600,
      );

      expect(result.isError).toBe(false);
      expect(result.value).toEqual(null);
    });
  });

  describe("Given sessionId value in Items array is empty", () => {
    it("Returns success response will value of null", async () => {
      const service = new recoverSessionService(
        "mockTableName",
        "mockIndexName",
      );

      const dbMock = mockClient(DynamoDBClient);
      dbMock.on(QueryCommand).resolves({
        Items: [
          {
            sub: { S: "mockSub" },
            state: { S: "mockValidState" },
            sessionId: { S: "" },
          },
        ],
      });

      const result = await service.getAuthSessionBySub(
        "mockSub",
        "mockState",
        3600,
      );

      expect(result.isError).toBe(false);
      expect(result.value).toEqual(null);
    });
  });

  describe("Given a valid recoverable session is found", () => {
    it("Returns a success response with sessionId as value", async () => {
      const service = new recoverSessionService(
        "mockTableName",
        "mockIndexName",
      );

      const dbMock = mockClient(DynamoDBClient);
      dbMock.on(QueryCommand).resolves({
        Items: [
          {
            sub: { S: "mockSub" },
            state: { S: "mockValidState" },
            sessionId: { S: "mockSessionId" },
          },
        ],
      });

      const result = await service.getAuthSessionBySub(
        "mockSub",
        "mockState",
        3600,
      );

      expect(result.isError).toBe(false);
      expect(result.value).toEqual("mockSessionId");
    });
  });
});
