import { sqsClient, writeToSqs } from "../writeToSqs";
import { expect } from "@jest/globals";
import "../../../../tests/testUtils/matchers";
import { AwsStub, mockClient } from "aws-sdk-client-mock";
import {
  SendMessageCommand,
  ServiceInputTypes,
  ServiceOutputTypes,
  SQSClientResolvedConfig,
} from "@aws-sdk/client-sqs";
import { emptyFailure, emptySuccess, Result } from "../../utils/result";

describe("Write to SQS", () => {
  let consoleDebugSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let sqsMock: AwsStub<
    ServiceInputTypes,
    ServiceOutputTypes,
    SQSClientResolvedConfig
  >;
  let result: Result<void, void>;
  const mockMessage = {
    biometricSessionId: "mockBiometricSessionId",
    sessionId: "mockSessionId",
  };

  beforeEach(() => {
    consoleDebugSpy = jest.spyOn(console, "debug");
    consoleErrorSpy = jest.spyOn(console, "error");
    sqsMock = mockClient(sqsClient);
    sqsMock.on(SendMessageCommand).resolves({});
  });

  describe("On every invocation", () => {
    beforeEach(async () => {
      await writeToSqs("www.mockQueueArn.com", mockMessage);
    });

    it("Logs attempt at debug level", () => {
      expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_WRITE_TO_SQS_ATTEMPT",
      });
    });
  });

  describe("Given writing to SQS fails", () => {
    beforeEach(async () => {
      sqsMock.on(SendMessageCommand).rejects("Failed to write to SQS");

      result = await writeToSqs("www.mockQueueArn.com", mockMessage);
    });

    it("Logs failed attempt", () => {
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_WRITE_TO_SQS_FAILURE",
      });
    });

    it("Returns emptyFailure Result", () => {
      expect(result).toEqual(emptyFailure());
    });
  });

  describe("Given writing to SQS succeeds", () => {
    beforeEach(async () => {
      sqsMock.on(SendMessageCommand).resolves({});

      result = await writeToSqs("www.mockQueueArn.com", mockMessage);
    });

    it("Logs successful attempt at debug level", () => {
      expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_WRITE_TO_SQS_SUCCESS",
      });
    });

    it("Returns an emptySuccess Result", () => {
      expect(result).toEqual(emptySuccess());
    });
  });
});
