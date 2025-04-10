import { expect } from "@jest/globals";
import { ICompositeKey } from "../../../common/dynamoDBAdapter/putItemOperation";
import "../../../testUtils/matchers";
import { PutItemCredentialResult } from "./putItemCredentialResult";

describe("Credential result put item operation", () => {
  let consoleErrorSpy: jest.SpyInstance;
  let putItemOperation: PutItemCredentialResult;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error");
    putItemOperation = new PutItemCredentialResult();
  });

  describe("Get DynamoDB put item composite key", () => {
    let result: ICompositeKey;

    beforeEach(() => {
      const credentialResult = {
        sub: "mockSub",
        sentTimestamp: "mockSentTimestamp",
      };
      result =
        putItemOperation.getDynamoDbPutItemCompositeKey(credentialResult);
    });

    it("Returns an object with a pk and sk value", () => {
      expect(result).toStrictEqual({
        pk: "SUB#mockSub",
        sk: "SENT_TIMESTAMP#mockSentTimestamp",
      });
    });
  });

  describe("Handle put item error", () => {
    beforeEach(() => {
      putItemOperation.handlePutItemError("mockError");
    });

    it("Logs an error message", () => {
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        messageCode:
          "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_WRITE_TO_DATABASE_FAILURE",
        error: "mockError",
      });
    });
  });
});
