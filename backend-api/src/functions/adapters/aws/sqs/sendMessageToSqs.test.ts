import {
  SendMessageCommand,
  ServiceInputTypes,
  ServiceOutputTypes,
  SQSClientResolvedConfig,
} from "@aws-sdk/client-sqs";
import { expect } from "@jest/globals";
import { AwsStub, mockClient } from "aws-sdk-client-mock";
import "aws-sdk-client-mock-jest";
import "../../../../../tests/testUtils/matchers";
import { emptyFailure, Result, successResult } from "../../../utils/result";
import { sendMessageToSqs, sqsClient } from "./sendMessageToSqs";
import { mockMessageId } from "../../../testUtils/unitTestData";

describe("Sending a message to SQS", () => {
  let consoleDebugSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let sqsMock: AwsStub<
    ServiceInputTypes,
    ServiceOutputTypes,
    SQSClientResolvedConfig
  >;
  let result: Result<void, void>;
  const mockMessageBody = {
    biometricSessionId: "mockBiometricSessionId",
    sessionId: "mockSessionId",
  };
  const mockQueueArn = "mockQueueArn";

  beforeEach(() => {
    consoleDebugSpy = jest.spyOn(console, "debug");
    consoleErrorSpy = jest.spyOn(console, "error");
    sqsMock = mockClient(sqsClient);
  });

  describe("On every invocation", () => {
    beforeEach(async () => {
      sqsMock.on(SendMessageCommand).resolves({});

      await sendMessageToSqs(mockQueueArn, mockMessageBody);
    });

    it("Logs attempt at debug level", () => {
      expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_SEND_MESSAGE_TO_SQS_ATTEMPT",
        data: {
          sqsArn: mockQueueArn,
        },
      });
    });
  });

  describe("Given sending a message to SQS fails", () => {
    beforeEach(async () => {
      sqsMock.on(SendMessageCommand).rejects("Failed to send message to SQS");

      result = await sendMessageToSqs(mockQueueArn, mockMessageBody);
    });

    it("Attempts to send message to SQS", () => {
      const expectedCommandInput = {
        MessageBody: JSON.stringify(mockMessageBody),
        QueueUrl: mockQueueArn,
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
      sqsMock.on(SendMessageCommand).resolves({ MessageId: mockMessageId });

      result = await sendMessageToSqs(mockQueueArn, mockMessageBody);
    });

    it("Attempts to send message to SQS", () => {
      const expectedCommandInput = {
        MessageBody: JSON.stringify(mockMessageBody),
        QueueUrl: mockQueueArn,
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

    describe("Given the MessageId in the response is undefined", () => {
      beforeEach(async () => {
        sqsMock.on(SendMessageCommand).resolves({});

        result = await sendMessageToSqs(mockQueueArn, mockMessageBody);
      });

      it("Returns an Success Result with the messageId", () => {
        expect(result).toStrictEqual(successResult(undefined));
      });
    });

    describe("Given the MessageId in the response is undefined", () => {
      beforeEach(async () => {
        result = await sendMessageToSqs(mockQueueArn, mockMessageBody);
      });

      it("Returns an Success Result with the messageId", () => {
        expect(result).toStrictEqual(successResult(mockMessageId));
      });
    });
  });
});
