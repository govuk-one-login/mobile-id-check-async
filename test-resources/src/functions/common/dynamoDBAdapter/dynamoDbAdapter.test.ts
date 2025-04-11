import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { expect } from "@jest/globals";
import { mockClient } from "aws-sdk-client-mock";
import { NOW_IN_MILLISECONDS } from "../../dequeue/tests/testData";
import "../../testUtils/matchers";
import { Result } from "../utils/result";
import { DynamoDbAdapter, IDynamoDbAdapter } from "./dynamoDbAdapter";
import { PutItemOperation } from "./putItemOperation";

const mockDynamoDbClient = mockClient(DynamoDBClient);
let dynamoDbAdapter: IDynamoDbAdapter;
let consoleDebugSpy: jest.SpyInstance;
let consoleErrorSpy: jest.SpyInstance;

describe("DynamoDB adapter", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);
    dynamoDbAdapter = new DynamoDbAdapter({
      tableName: "mock-table-name",
      ttlInSeconds: 12345,
    });
    consoleDebugSpy = jest.spyOn(console, "debug");
    consoleErrorSpy = jest.spyOn(console, "error");
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.useRealTimers();
  });

  describe("Put item", () => {
    let result: Result<void, void>;

    describe("On every attempt", () => {
      beforeEach(async () => {
        mockDynamoDbClient.on(PutItemCommand).resolves({});
        await dynamoDbAdapter.putItem(mockPutItemOperation);
      });

      it("Logs the attempt", () => {
        expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
          messageCode: "TEST_RESOURCES_DYNAMO_DB_ADAPTER_PUT_ITEM_ATTEMPT",
          putItemData: {
            tableName: "mock-table-name",
            pk: "mockPk",
            sk: "mockSk",
            timeToLiveInSeconds: 12345,
          },
        });
      });
    });

    describe("Given there is a failure attempting to put an item into DynamoDB", () => {
      beforeEach(async () => {
        mockDynamoDbClient.on(PutItemCommand).rejects("mockError");
        result = await dynamoDbAdapter.putItem(mockPutItemOperation);
      });

      it("Logs an error message", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "TEST_RESOURCES_DYNAMO_DB_ADAPTER_SEND_ITEM_COMMAND_FAILURE",
        });
      });

      it("Returns an empty success result", () => {
        expect(result.isError).toBe(true);
      });
    });

    describe("Given an item is successfully put into DynamoDB", () => {
      beforeEach(async () => {
        mockDynamoDbClient.on(PutItemCommand).resolves({});
        result = await dynamoDbAdapter.putItem(mockPutItemOperation);
      });

      it("Returns an empty success result", () => {
        expect(result.isError).toBe(false);
      });
    });
  });
});

const mockPutItemOperation: PutItemOperation = {
  getDynamoDbPutItemCompositeKey: () => ({ pk: "mockPk", sk: "mockSk" }),
  getDynamoDbPutItemEventPayload: () => JSON.stringify("mockEvent"),
};
