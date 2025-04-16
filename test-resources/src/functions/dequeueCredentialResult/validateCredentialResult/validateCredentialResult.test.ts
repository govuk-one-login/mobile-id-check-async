import { expect } from "@jest/globals";
import { Result } from "../../common/utils/result";
import "../../testUtils/matchers";
import {
  failingSQSRecordBodyInvalidJSON,
  failingSQSRecordBodyInvalidSub,
  failingSQSRecordBodyIsNull,
  failingSQSRecordBodyMissingSub,
  failingSQSRecordBodyNotAnObject,
  failingSQSRecordBodySubTypeInvalid,
} from "../unitTestData";
import {
  IValidCredentialResultData,
  validateCredentialResult,
} from "./validateCredentialResult";

describe("Validate credential result", () => {
  let result: Result<IValidCredentialResultData>;

  describe("Given credential result is not valid JSON", () => {
    beforeEach(() => {
      const recordBody: string = failingSQSRecordBodyInvalidJSON.body;
      result = validateCredentialResult(recordBody);
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

  describe("Given credential result is not null", () => {
    beforeEach(() => {
      const recordBody: string = failingSQSRecordBodyIsNull.body;
      result = validateCredentialResult(recordBody);
    });

    it("Returns an error result", () => {
      expect(result.isError).toBe(true);
    });

    it("Returns an error message", () => {
      expect(result.value).toStrictEqual({
        errorMessage: "credential result is null",
      });
    });
  });

  describe("Given credential result is not an object", () => {
    beforeEach(() => {
      const recordBody: string = failingSQSRecordBodyNotAnObject.body;
      result = validateCredentialResult(recordBody);
    });

    it("Returns an error result", () => {
      expect(result.isError).toBe(true);
    });

    it("Returns an error message", () => {
      expect(result.value).toStrictEqual({
        errorMessage: "credentialResult is not an object",
      });
    });
  });

  describe("Given credential result is missing a sub", () => {
    beforeEach(() => {
      const recordBody: string = failingSQSRecordBodyMissingSub.body;
      result = validateCredentialResult(recordBody);
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

  describe("Given sub is invalid", () => {
    beforeEach(() => {
      const recordBody: string = failingSQSRecordBodyInvalidSub.body;
      result = validateCredentialResult(recordBody);
    });

    it("Returns an error result", () => {
      expect(result.isError).toBe(true);
    });

    it("Returns an error message", () => {
      expect(result.value).toStrictEqual({
        errorMessage: "sub is invalid",
      });
    });
  });

  describe("Given sub is not a string", () => {
    beforeEach(() => {
      const recordBody: string = failingSQSRecordBodySubTypeInvalid.body;
      result = validateCredentialResult(recordBody);
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
});
