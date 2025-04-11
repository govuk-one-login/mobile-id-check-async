import { expect } from "@jest/globals";
import { SQSRecord } from "aws-lambda";
import { Result } from "../../common/utils/result";
import "../../testUtils/matchers";
import {
  failingSQSRecordBodyInvalidJSON,
  failingSQSRecordBodyMissing,
  failingSQSRecordBodyMissingEvent,
  failingSQSRecordBodyMissingSub,
  failingSQSRecordBodyMissingTimestamp,
  failingSQSRecordBodySubTypeInvalid,
} from "../unitTestData";
import { validateCredentialResult } from "./validateCredentialResult";
import { IPutItemOperationData } from "../../common/dynamoDbAdapter/putItemOperation";

describe("Validate credential result", () => {
  let result: Result<IPutItemOperationData>;

  describe("Given credential result is missing a timestamp", () => {
    beforeEach(() => {
      const sqsRecord: SQSRecord = failingSQSRecordBodyMissingTimestamp;
      result = validateCredentialResult(sqsRecord);
    });

    it("Returns an error result", () => {
      expect(result.isError).toBe(true);
    });

    it("Returns an error message", () => {
      expect(result.value).toStrictEqual({
        errorMessage: `SentTimestamp is missing from record`,
      });
    });
  });

  describe("Given the SQS record body is empty", () => {
    beforeEach(() => {
      const sqsRecord: SQSRecord = failingSQSRecordBodyMissing;
      result = validateCredentialResult(sqsRecord);
    });

    it("Returns an error result", () => {
      expect(result.isError).toBe(true);
    });

    it("Returns an error message", () => {
      expect(result.value).toStrictEqual({
        errorMessage: "Record body is empty",
      });
    });
  });

  describe("Given credential result is not valid JSON", () => {
    beforeEach(() => {
      const sqsRecord: SQSRecord = failingSQSRecordBodyInvalidJSON;
      result = validateCredentialResult(sqsRecord);
    });

    it("Returns an error result", () => {
      expect(result.isError).toBe(true);
    });

    it("Returns an error message", () => {
      expect(result.value).toStrictEqual({
        errorMessage: expect.stringContaining(
          "Record body could not be parsed as JSON. SyntaxError: Expected property name or '}' in JSON at position 2",
        ),
      });
    });
  });

  describe("Given credential result is missing a sub", () => {
    beforeEach(() => {
      const sqsRecord: SQSRecord = failingSQSRecordBodyMissingSub;
      result = validateCredentialResult(sqsRecord);
    });

    it("Returns an error result", () => {
      expect(result.isError).toBe(true);
    });

    it("Returns an error message", () => {
      expect(result.value).toStrictEqual({
        errorMessage: "sub is missing from record body",
      });
    });
  });

  describe("Given sub is not a string", () => {
    beforeEach(() => {
      const sqsRecord: SQSRecord = failingSQSRecordBodySubTypeInvalid;
      result = validateCredentialResult(sqsRecord);
    });

    it("Returns an error result", () => {
      expect(result.isError).toBe(true);
    });

    it("Returns an error message", () => {
      expect(result.value).toStrictEqual({
        errorMessage: "sub is not a string. Incoming sub is type: number",
      });
    });
  });

  describe("Given event is missing", () => {
    beforeEach(() => {
      const sqsRecord: SQSRecord = failingSQSRecordBodyMissingEvent;
      result = validateCredentialResult(sqsRecord);
    });

    it("Returns an error result", () => {
      expect(result.isError).toBe(true);
    });

    it("Returns an error message", () => {
      expect(result.value).toStrictEqual({
        errorMessage: "event is missing from record body",
      });
    });
  });
});
