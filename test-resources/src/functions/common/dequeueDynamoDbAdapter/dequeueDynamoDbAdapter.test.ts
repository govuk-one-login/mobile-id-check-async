import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { expect } from "@jest/globals";
import { mockClient } from "aws-sdk-client-mock";
import { NOW_IN_MILLISECONDS } from "../../dequeue/tests/testData";
import "../../testUtils/matchers";
import { Result } from "../utils/result";
import {
  DequeueDynamoDbAdapter,
  DequeueDynamoDbPutItemInput,
  IDequeueDynamoDbAdapter,
} from "./dequeueDynamoDbAdapter";

const mockDynamoDbClient = mockClient(DynamoDBClient);
let dynamoDbAdapter: IDequeueDynamoDbAdapter;
let consoleDebugSpy: jest.SpyInstance;
let consoleErrorSpy: jest.SpyInstance;

describe("DynamoDB adapter", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);
    dynamoDbAdapter = new DequeueDynamoDbAdapter({
      tableName: "mock-table-name",
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
        await dynamoDbAdapter.putItem(mockPutItemInput);
      });

      it("Logs the attempt", () => {
        expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
          messageCode: "TEST_RESOURCES_PUT_ITEM_ATTEMPT",
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
        result = await dynamoDbAdapter.putItem(mockPutItemInput);
      });

      describe("Given there is no error message", () => {
        beforeEach(async () => {
          mockDynamoDbClient.on(PutItemCommand).rejects("");
          result = await dynamoDbAdapter.putItem(mockPutItemInput);
        });

        it("Logs an error message", () => {
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "TEST_RESOURCES_PUT_ITEM_UNEXPECTED_FAILURE",
            errorMessage: "Unknown error",
          });
        });
      });

      describe("Given an error message exists", () => {
        beforeEach(async () => {
          mockDynamoDbClient.on(PutItemCommand).rejects("mockError");
          result = await dynamoDbAdapter.putItem(mockPutItemInput);
        });

        it("Logs an error message", () => {
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "TEST_RESOURCES_PUT_ITEM_UNEXPECTED_FAILURE",
            errorMessage: "mockError",
          });
        });
      });

      it("Returns an empty failure result", () => {
        expect(result.isError).toBe(true);
        expect(result).not.toHaveProperty("value");
      });
    });

    describe("Given an item is successfully put into DynamoDB", () => {
      beforeEach(async () => {
        mockDynamoDbClient.on(PutItemCommand).resolves({});
        result = await dynamoDbAdapter.putItem(mockPutItemInput);
      });

      it("Logs success at debug level", () => {
        expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
          messageCode: "TEST_RESOURCES_PUT_ITEM_SUCCESS",
        });
      });

      it("Returns an empty success result", () => {
        expect(result.isError).toBe(false);
        expect(result).not.toHaveProperty("value");
      });
    });
  });
});

const mockPutItemInput: DequeueDynamoDbPutItemInput = {
  pk: "mockPk",
  sk: "mockSk",
  event: JSON.stringify("mockEvent"),
  timeToLiveInSeconds: 12345,
};
