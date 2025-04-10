import { expect } from "@jest/globals";
import { ICompositeKey } from "../../../common/dynamoDBAdapter/putItemOperation";
import "../../../testUtils/matchers";
import { PutItemCredentialResult } from "./putItemCredentialResult";

describe("Credential result put item operation", () => {
  let putItemOperation: PutItemCredentialResult;

  beforeEach(() => {
    const compositeKeyData = {
      sub: "mockSub",
      sentTimestamp: "mockSentTimestamp",
    };
    putItemOperation = new PutItemCredentialResult(compositeKeyData);
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
});
