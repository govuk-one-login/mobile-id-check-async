import { expect } from "@jest/globals";
import { SQSRecord } from "aws-lambda";
import "../../testUtils/matchers";
import { Result } from "../../common/utils/result";
import { IProcessedMessage } from "../dequeueCredentialResultHandler";
import {
  failingSQSRecordBodyInvalidJSON,
  failingSQSRecordBodyMissingSub,
  failingSQSRecordBodyMissingTimestamp,
} from "../unitTestData";
import { validateCredentialResults } from "./validateCredentialResult";

describe("Validate credential result", () => {
  let consoleErrorSpy: jest.SpyInstance;

  describe("Given there are no records in the records array", () => {
    let result: Result<IProcessedMessage[]>;

    beforeEach(() => {
      const sqsRecords: SQSRecord[] = [];
      consoleErrorSpy = jest.spyOn(console, "error");
      result = validateCredentialResults(sqsRecords);
    });

    it("Returns an error result", () => {
      expect(result.isError).toBe(true);
    });

    it("Logs an error", () => {
      expect(result.value).toStrictEqual({
        errorMessage: "Records array is empty.",
      });
    });
  });

  describe("Given credential result is missing a timestamp", () => {
    let result: Result<IProcessedMessage[]>;

    beforeEach(() => {
      const sqsRecords: SQSRecord[] = [failingSQSRecordBodyMissingTimestamp];
      result = validateCredentialResults(sqsRecords);
    });

    it("Returns an error result", () => {
      expect(result.isError).toBe(true);
    });

    it("Logs an error", () => {
      expect(result.value).toStrictEqual({
        errorMessage: `SentTimestamp is missing from record`,
      });
    });
  });

  describe("Given the SQS record body is missing", () => {});

  describe("Given credential result is not valid JSON", () => {
    let result: Result<IProcessedMessage[]>;

    beforeEach(() => {
      const sqsRecords: SQSRecord[] = [failingSQSRecordBodyInvalidJSON];
      consoleErrorSpy = jest.spyOn(console, "error");
      result = validateCredentialResults(sqsRecords);
    });

    it("Returns an error result", () => {
      expect(result.isError).toBe(true);
    });
    it("Logs an error", () => {
      expect(result.value).toStrictEqual({
        errorMessage:
          "Record body could not be parsed as JSON. SyntaxError: Expected property name or '}' in JSON at position 2 (line 1 column 3)",
      });
    });
  });

  describe("Given credential result is missing a sub", () => {
    let result: Result<IProcessedMessage[]>;

    beforeEach(() => {
      const sqsRecords: SQSRecord[] = [failingSQSRecordBodyMissingSub];
      result = validateCredentialResults(sqsRecords);
    });

    it("Returns an error result", () => {
      expect(result.isError).toBe(true);
    });

    it("Returns an error message", () => {
      expect(result.value).toStrictEqual({
        errorMessage: `sub is missing from credential result. Credential result: { timestamp: \"mockTimestamp\" }`,
      });
    });
  });
});
