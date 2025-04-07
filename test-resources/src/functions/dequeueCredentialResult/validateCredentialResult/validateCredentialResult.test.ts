import { expect } from "@jest/globals";
import { SQSRecord } from "aws-lambda";
import "../../testUtils/matchers";
import { Result } from "../../common/utils/result";
import { IProcessedMessage } from "../dequeueCredentialResultHandler";
import { failingSQSRecordBodyInvalidJSON, failingSQSRecordBodyMissingSub, failingSQSRecordBodyMissingTimestamp } from "../unitTestData";
import { validateCredentialResult } from "./validateCredentialResult";

describe("Validate credential result", () => {
  let consoleErrorSpy: jest.SpyInstance;

  describe("Given credential result is not valid JSON", () => {
    let result: Result<IProcessedMessage, void>

    beforeEach(() => {
      const sqsRecord: SQSRecord = failingSQSRecordBodyInvalidJSON
      consoleErrorSpy = jest.spyOn(console, "error");
      result = validateCredentialResult(sqsRecord);
    });

    it("Returns an error result", () => {
      expect(result.isError).toBe(true)
    });
    it("Returns an error message", () => {
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        messageCode: "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_INVALID_JSON",
      });
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        message: "Failed to parse credential result. Invalid JSON.",
      });
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        recordBody: "{ mockInvalidJSON",
      });
    });
  });

  describe("Given credential result is missing a subjectIdentifier", () => {
    let result: Result<IProcessedMessage, void>

    beforeEach(() => {
      const sqsRecord: SQSRecord = failingSQSRecordBodyMissingSub
      result = validateCredentialResult(sqsRecord);
    });

    it("Returns an error result", () => {
      expect(result.isError).toBe(true)
    });
    it("Returns an error message", () => {
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        messageCode: "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_MISSING_SUB",
      });
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        message: "Credential result is missing a subjectIdentifier",
      });
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        credentialResult: { timestamp: "mockTimestamp" },
      });
    });
  });

  describe("Given credential result is missing a timestamp", () => {
    let result: Result<IProcessedMessage, void>

    beforeEach(() => {
      const sqsRecord: SQSRecord = failingSQSRecordBodyMissingTimestamp
      result = validateCredentialResult(sqsRecord);
    });

    it("Returns an error result", () => {
      expect(result.isError).toBe(true)
    });
    it("Returns an error message", () => {
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        messageCode:
          "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_MISSING_TIMESTAMP",
      });
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        message: "Credential result is missing a timestamp",
      });
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        credentialResult: { subjectIdentifier: "mockSubjectIdentifier" },
      });
    });
  });
})
