import { expect } from "@jest/globals";
import { ICompositeKey } from "../../../common/dynamoDbAdapter/putItemOperation";
import "../../../testUtils/matchers";
import { PutItemCredentialResult } from "./putItemCredentialResult";

describe("Credential result put item operation", () => {
  let putItemOperation: PutItemCredentialResult;

  beforeEach(() => {
    const putItemOperationData = {
      compositeKeyData: {
        sub: "mockSub",
        sentTimestamp: "mockSentTimestamp",
      },
      event: "mockEvent",
      timeToLiveInSeconds: 12345,
    };
    putItemOperation = new PutItemCredentialResult(putItemOperationData);
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
      expect(result).toStrictEqual(12345);
    });
  });
});
