import { sendMessageToSqs } from "./sendMessageToSqs";
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
import { sqsClient } from "./sqsClient";
import "aws-sdk-client-mock-jest";

describe("Sending a message to SQS", () => {
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
      await sendMessageToSqs("www.mockQueueArn.com", mockMessage);
    });

    it("Logs attempt at debug level", () => {
      expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_SEND_MESSAGE_TO_SQS_ATTEMPT",
      });
    });
  });

  describe("Given sending a message to SQS fails", () => {
    beforeEach(async () => {
      sqsMock.on(SendMessageCommand).rejects("Failed to send message to SQS");

      result = await sendMessageToSqs("www.mockQueueUrl.com", mockMessage);
    });

    it("Attempts to send message to SQS", () => {
      const expectedCommandInput = {
        MessageBody: JSON.stringify(mockMessage),
        QueueUrl: "www.mockQueueUrl.com",
      };

      expect(sqsMock).toHaveReceivedCommandWith(
        SendMessageCommand,
        expectedCommandInput,
      );
    });

    it("Logs failed attempt", () => {
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_SEND_MESSAGE_TO_SQS_FAILURE",
      });
    });

    it("Returns emptyFailure Result", () => {
      expect(result).toEqual(emptyFailure());
    });
  });

  describe("Given sending message to SQS succeeds", () => {
    beforeEach(async () => {
      sqsMock.on(SendMessageCommand).resolves({});

      result = await sendMessageToSqs("www.mockQueueUrl.com", mockMessage);
    });

    it("Attempts to send message to SQS", () => {
      const expectedCommandInput = {
        MessageBody: JSON.stringify(mockMessage),
        QueueUrl: "www.mockQueueUrl.com",
      };

      expect(sqsMock).toHaveReceivedCommandWith(
        SendMessageCommand,
        expectedCommandInput,
      );
    });

    it("Logs successful attempt at debug level", () => {
      expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_SEND_MESSAGE_TO_SQS_SUCCESS",
      });
    });

    it("Returns an emptySuccess Result", () => {
      expect(result).toEqual(emptySuccess());
    });
  });
});
