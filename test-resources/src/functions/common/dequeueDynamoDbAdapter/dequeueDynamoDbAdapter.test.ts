import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import {
  mockPutItemInput,
  NOW_IN_MILLISECONDS,
} from "../../dequeueEvents/tests/testData";
import "../../testUtils/matchers";
import { emptyFailure, emptySuccess, Result } from "../utils/result";
import {
  DequeueDynamoDbAdapter,
  IDequeueDynamoDbAdapter,
} from "./dequeueDynamoDbAdapter";
import { marshall } from "@aws-sdk/util-dynamodb";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  MockInstance,
  vi,
} from "vitest";

const mockDynamoDbClient = mockClient(DynamoDBClient);
let dequeueDynamoDbAdapter: IDequeueDynamoDbAdapter;
let consoleDebugSpy: MockInstance;
let consoleErrorSpy: MockInstance;

describe("Dequeue DynamoDB adapter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW_IN_MILLISECONDS);
    dequeueDynamoDbAdapter = new DequeueDynamoDbAdapter("mock-table-name");
    consoleDebugSpy = vi.spyOn(console, "debug");
    consoleErrorSpy = vi.spyOn(console, "error");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Put item", () => {
    let result: Result<void, void>;

    describe("On every attempt", () => {
      beforeEach(async () => {
        mockDynamoDbClient.on(PutItemCommand).resolves({});
        await dequeueDynamoDbAdapter.putItem(mockPutItemInput);
      });

      it("Logs the attempt", () => {
        expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
          messageCode: "TEST_RESOURCES_DEQUEUE_PUT_ITEM_ATTEMPT",
          putItemData: {
            tableName: "mock-table-name",
            pk: "mockPk",
            sk: "mockSk",
            timeToLiveInSeconds: 1704122745,
          },
        });
      });
    });

    describe("Given there is a failure attempting to put an item into DynamoDB", () => {
      beforeEach(async () => {
        mockDynamoDbClient.on(PutItemCommand).rejects("mockError");
        result = await dequeueDynamoDbAdapter.putItem(mockPutItemInput);
      });

      it("Logs an error message", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "TEST_RESOURCES_DEQUEUE_PUT_ITEM_UNEXPECTED_FAILURE",
          pk: "mockPk",
          sk: "mockSk",
        });
      });

      it("Returns an empty failure result", () => {
        expect(result).toEqual(emptyFailure());
      });
    });

    describe("Given an item is successfully put into DynamoDB", () => {
      beforeEach(async () => {
        const expectedPutItemCommandInput = {
          TableName: "mock-table-name",
          Item: marshall({
            pk: "mockPk",
            sk: "mockSk",
            body: "mockBody",
            timeToLiveInSeconds: 1704122745,
          }),
        };
        mockDynamoDbClient
          .onAnyCommand() // default
          .rejects("Did not receive expected input")
          .on(PutItemCommand, expectedPutItemCommandInput, true) // match to expected input
          .resolves({});
        result = await dequeueDynamoDbAdapter.putItem(mockPutItemInput);
      });

      it("Logs success at debug level", () => {
        expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
          messageCode: "TEST_RESOURCES_DEQUEUE_PUT_ITEM_SUCCESS",
        });
      });

      it("Returns an empty success result", () => {
        expect(result).toEqual(emptySuccess());
      });
    });
  });
});
