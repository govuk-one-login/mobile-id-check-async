import { mockClient } from "aws-sdk-client-mock";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { EventService } from "../eventService";
import { sqsClient } from "../sqsClient";
import { ErrorCategory } from "../../../utils/result";

describe("Event Service", () => {
  describe("Writing generic event to SQS", () => {
    describe("Given writing event to SQS fails", () => {
      it("Returns an error response", async () => {
        const sqsMock = mockClient(sqsClient);
        const eventWriter = new EventService("mockSqsQueue");
        sqsMock.on(SendMessageCommand).rejects("Failed to write to SQS");

        const result = await eventWriter.writeGenericEvent({
          eventName: "DCMAW_ASYNC_CRI_START",
          sub: "mockSub",
          sessionId: "mockSessionId",
          govukSigninJourneyId: "mockGovukSigninJourneyId",
          getNowInMilliseconds: () => 1609462861000,
          componentId: "mockComponentId",
        });

        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Failed to write to SQS",
          errorCategory: ErrorCategory.SERVER_ERROR,
        });

        expect(sqsMock.call(0).args[0].input).toEqual({
          MessageBody: JSON.stringify({
            user: {
              user_id: "mockSub",
              transaction_id: "",
              session_id: "mockSessionId",
              govuk_signin_journey_id: "mockGovukSigninJourneyId",
            },
            timestamp: 1609462861,
            event_timestamp_ms: 1609462861000,
            event_name: "DCMAW_ASYNC_CRI_START",
            component_id: "mockComponentId",
          }),
          QueueUrl: "mockSqsQueue",
        });
      });

      describe("Given writing to SQS is successful", () => {
        it("Returns a log", async () => {
          const sqsMock = mockClient(sqsClient);
          const eventWriter = new EventService("mockSqsQueue");
          sqsMock.on(SendMessageCommand).resolves({});

          const result = await eventWriter.writeGenericEvent({
            eventName: "DCMAW_ASYNC_CRI_START",
            sub: "mockSub",
            sessionId: "mockSessionId",
            govukSigninJourneyId: "mockGovukSigninJourneyId",
            getNowInMilliseconds: () => 1609462861000,
            componentId: "mockComponentId",
          });

          expect(result.isError).toBe(false);
          expect(result.value).toEqual(null);

          expect(sqsMock.call(0).args[0].input).toEqual({
            MessageBody: JSON.stringify({
              user: {
                user_id: "mockSub",
                transaction_id: "",
                session_id: "mockSessionId",
                govuk_signin_journey_id: "mockGovukSigninJourneyId",
              },
              timestamp: 1609462861,
              event_timestamp_ms: 1609462861000,
              event_name: "DCMAW_ASYNC_CRI_START",
              component_id: "mockComponentId",
            }),
            QueueUrl: "mockSqsQueue",
          });
        });
      });
    });
  });

  describe("Writing credential token issued event to SQS", () => {
    describe("Given writing event to SQS fails", () => {
      it("Returns an error response", async () => {
        const sqsMock = mockClient(sqsClient);
        const eventWriter = new EventService("mockSqsQueue");
        sqsMock.on(SendMessageCommand).rejects("Failed to write to SQS");

        const result = await eventWriter.writeCredentialTokenIssuedEvent({
          getNowInMilliseconds: () => 1609462861000,
          componentId: "mockComponentId",
          eventName: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
        });

        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Failed to write to SQS",
          errorCategory: ErrorCategory.SERVER_ERROR,
        });

        expect(sqsMock.call(0).args[0].input).toStrictEqual({
          MessageBody: JSON.stringify({
            event_name: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
            component_id: "mockComponentId",
            timestamp: 1609462861,
            event_timestamp_ms: 1609462861000,
          }),
          QueueUrl: "mockSqsQueue",
        });
      });
    });

    describe("Given writing to SQS is successful", () => {
      it("Returns a log", async () => {
        const sqsMock = mockClient(sqsClient);
        const eventWriter = new EventService("mockSqsQueue");
        sqsMock.on(SendMessageCommand).resolves({});

        const result = await eventWriter.writeCredentialTokenIssuedEvent({
          getNowInMilliseconds: () => 1609462861000,
          componentId: "mockComponentId",
          eventName: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
        });

        expect(result.isError).toBe(false);
        expect(result.value).toEqual(null);

        expect(sqsMock.call(0).args[0].input).toStrictEqual({
          MessageBody: JSON.stringify({
            event_name: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
            component_id: "mockComponentId",
            timestamp: 1609462861,
            event_timestamp_ms: 1609462861000,
          }),
          QueueUrl: "mockSqsQueue",
        });
      });
    });
  });
});
