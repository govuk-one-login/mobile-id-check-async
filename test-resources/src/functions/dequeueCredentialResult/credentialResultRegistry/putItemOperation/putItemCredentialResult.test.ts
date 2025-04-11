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

    it("Returns an object with a pk and sk value", () => {
      expect(result).toStrictEqual(JSON.stringify("mockEvent"));
    });
  });
});
