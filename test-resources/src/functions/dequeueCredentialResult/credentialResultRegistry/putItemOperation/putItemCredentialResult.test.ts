import { expect } from "@jest/globals";
import { ICompositeKey } from "../../../common/dynamoDbAdapter/putItemOperation";
import "../../../testUtils/matchers";
import { PutItemCredentialResult } from "./putItemCredentialResult";
import { NOW_IN_MILLISECONDS } from "../../../dequeue/tests/testData";

describe("Credential result put item operation", () => {
  let putItemOperation: PutItemCredentialResult;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);
    const putItemOperationData = {
      compositeKeyData: {
        sub: "mockSub",
        sentTimestamp: "mockSentTimestamp",
      },
      event: "mockEvent",
      ttlDurationInSeconds: "3600",
    };
    putItemOperation = new PutItemCredentialResult(putItemOperationData);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Get DynamoDB put item composite key", () => {
    let result: ICompositeKey;

    beforeEach(() => {
      result = putItemOperation.getDynamoDbPutItemCompositeKey();
    });

    it("Returns an object with a pk and sk value", () => {
      expect(result).toStrictEqual({
        pk: "SUB#mockSub",
        sk: "SENT_TIMESTAMP#mockSentTimestamp",
      });
    });
  });

  describe("Get DynamoDB put item event payload", () => {
    let result: string;

    beforeEach(() => {
      result = putItemOperation.getDynamoDbPutItemEventPayload();
    });

    it("Returns an event payload", () => {
      expect(result).toStrictEqual(JSON.stringify("mockEvent"));
    });
  });

  describe("Get DynamoDB put item time to live", () => {
    let result: number;

    beforeEach(() => {
      result = putItemOperation.getDynamoDbPutItemTimeToLive();
    });

    it("Returns a time to live", () => {
      expect(result).toStrictEqual(1704114000);
    });
  });
});
