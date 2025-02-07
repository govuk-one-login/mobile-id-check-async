import { AwsStub, mockClient } from "aws-sdk-client-mock";
import {
  SendMessageCommand,
  ServiceInputTypes,
  ServiceOutputTypes,
  SQSClientResolvedConfig,
} from "@aws-sdk/client-sqs";
import { EventService } from "../eventService";
import { sqsClient } from "../sqsClient";
import { GenericEventNames } from "../types";
import { Result } from "../../../utils/result";
import "aws-sdk-client-mock-jest";

describe("Event Service", () => {
  const eventWriter = new EventService("mockSqsQueue");

  let sqsMock: AwsStub<
    ServiceInputTypes,
    ServiceOutputTypes,
    SQSClientResolvedConfig
  >;
  let result: Result<null>;
  beforeEach(() => {
    sqsMock = mockClient(sqsClient);
  });

  describe.each<GenericEventNames>([
    "DCMAW_ASYNC_CRI_START",
    "DCMAW_ASYNC_CRI_4XXERROR",
  ])("Writing generic TxMA events to SQS", (genericEventName) => {
    describe(`Given writing ${genericEventName} event to SQS fails`, () => {
      beforeEach(async () => {
        sqsMock.on(SendMessageCommand).rejects("Failed to write to SQS");

        result = await eventWriter.writeGenericEvent({
          eventName: genericEventName,
          sub: "mockSub",
          sessionId: "mockSessionId",
          govukSigninJourneyId: "mockGovukSigninJourneyId",
          getNowInMilliseconds: () => 1609462861000,
          componentId: "mockComponentId",
        });
      });

      it(`Attempts to send ${genericEventName} TxMA event to SQS`, () => {
        const expectedCommandInput = {
          MessageBody: JSON.stringify({
            user: {
              user_id: "mockSub",
              session_id: "mockSessionId",
              govuk_signin_journey_id: "mockGovukSigninJourneyId",
            },
            timestamp: 1609462861,
            event_timestamp_ms: 1609462861000,
            event_name: genericEventName,
            component_id: "mockComponentId",
          }),
          QueueUrl: "mockSqsQueue",
        };

        expect(sqsMock).toHaveReceivedCommandWith(
          SendMessageCommand,
          expectedCommandInput,
        );
      });

      it("Returns an error result", () => {
        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Failed to write to SQS",
        });
      });
    });

    describe(`Given writing ${genericEventName} to SQS is successful`, () => {
      beforeEach(async () => {
        sqsMock.on(SendMessageCommand).resolves({});

        result = await eventWriter.writeGenericEvent({
          eventName: genericEventName,
          sub: "mockSub",
          sessionId: "mockSessionId",
          govukSigninJourneyId: "mockGovukSigninJourneyId",
          getNowInMilliseconds: () => 1609462861000,
          componentId: "mockComponentId",
        });
      });

      it(`Attempts to send ${genericEventName} event to SQS`, () => {
        const expectedCommandInput = {
          MessageBody: JSON.stringify({
            user: {
              user_id: "mockSub",
              session_id: "mockSessionId",
              govuk_signin_journey_id: "mockGovukSigninJourneyId",
            },
            timestamp: 1609462861,
            event_timestamp_ms: 1609462861000,
            event_name: genericEventName,
            component_id: "mockComponentId",
          }),
          QueueUrl: "mockSqsQueue",
        };

        expect(sqsMock).toHaveReceivedCommandWith(
          SendMessageCommand,
          expectedCommandInput,
        );
      });

      it("Returns a success result", () => {
        expect(result.isError).toBe(false);
        expect(result.value).toEqual(null);
      });
    });
  });

  describe("Writing credential token issued event to SQS", () => {
    describe("Given writing DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED event to SQS fails", () => {
      beforeEach(async () => {
        sqsMock.on(SendMessageCommand).rejects("Failed to write to SQS");

        result = await eventWriter.writeCredentialTokenIssuedEvent({
          getNowInMilliseconds: () => 1609462861000,
          componentId: "mockComponentId",
          eventName: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
        });
      });

      it("Attempts to send DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED event to SQS", () => {
        const expectedCommandInput = {
          MessageBody: JSON.stringify({
            event_name: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
            component_id: "mockComponentId",
            timestamp: 1609462861,
            event_timestamp_ms: 1609462861000,
          }),
          QueueUrl: "mockSqsQueue",
        };

        expect(sqsMock).toHaveReceivedCommandWith(
          SendMessageCommand,
          expectedCommandInput,
        );
      });

      it("Returns an error result", () => {
        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Failed to write to SQS",
        });
      });
    });

    describe("Given writing to SQS is successful", () => {
      beforeEach(async () => {
        sqsMock.on(SendMessageCommand).resolves({});

        result = await eventWriter.writeCredentialTokenIssuedEvent({
          getNowInMilliseconds: () => 1609462861000,
          componentId: "mockComponentId",
          eventName: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
        });
      });

      it("Attempts to send DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED event to SQS", () => {
        const expectedCommandInput = {
          MessageBody: JSON.stringify({
            event_name: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
            component_id: "mockComponentId",
            timestamp: 1609462861,
            event_timestamp_ms: 1609462861000,
          }),
          QueueUrl: "mockSqsQueue",
        };

        expect(sqsMock).toHaveReceivedCommandWith(
          SendMessageCommand,
          expectedCommandInput,
        );
      });

      it("Returns a success result", () => {
        expect(result.isError).toBe(false);
        expect(result.value).toEqual(null);
      });
    });
  });
});
