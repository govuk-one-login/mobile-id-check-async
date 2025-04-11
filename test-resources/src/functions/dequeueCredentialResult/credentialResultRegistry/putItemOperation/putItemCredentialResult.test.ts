import { expect } from "@jest/globals";
import { ICompositeKey } from "../../../common/dynamoDBAdapter/putItemOperation";
import { NOW_IN_MILLISECONDS } from "../../../dequeue/tests/testData";
import "../../../testUtils/matchers";
import { PutItemCredentialResult } from "./putItemCredentialResult";

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
      result = putItemOperation.getDynamoDbPutItemCommandInput();
    });

    it("Returns an object with a pk and sk value", () => {
      expect(result).toStrictEqual({
        pk: "SUB#mockSub",
        sk: "SENT_TIMESTAMP#mockSentTimestamp",
        event: JSON.stringify("mockEvent"),
        timeToLiveInSeconds: 1704114000,
      });
    });
  });
});
