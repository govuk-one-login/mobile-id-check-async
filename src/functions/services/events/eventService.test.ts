import { EventService } from "./eventService";
import { mockClient } from "aws-sdk-client-mock";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { sqsClient } from "./sqsClient";

describe("Event Service", () => {
  describe("Writing to sqs", () => {
    describe("Given writing to SQS fails", () => {
      it("Returns an error response", async () => {
        const sqsMock = mockClient(sqsClient);
        const eventWriter = new EventService("mockSqsQueue");
        sqsMock.on(SendMessageCommand).rejects("Failed to write to SQS");

        const result = await eventWriter.writeEvent({
          eventName: "DCMAW_ASYNC_CRI_5XXERROR",
          sub: "mockSub",
          sessionId: "mockSessionId",
          ipAddress: "mockIpAddress",
          govukSigninJourneyId: "mockGovukSigninJourneyId",
          clientId: "mockClientId",
          getNowInMilliseconds: () => 1609462861,
          componentId: "mockComponentId",
        });

        expect(result.isError).toBe(true);
        expect(result.value).toEqual("Failed to write to SQS");
      });
    });

    describe("Given writing to SQS is successful", () => {
      it("Returns a log", async () => {
        const sqsMock = mockClient(sqsClient);
        const eventWriter = new EventService("mockSqsQueue");
        sqsMock.on(SendMessageCommand).resolves({});

        const result = await eventWriter.writeEvent({
          eventName: "DCMAW_ASYNC_CRI_5XXERROR",
          sub: "mockSub",
          sessionId: "mockSessionId",
          ipAddress: "mockIpAddress",
          govukSigninJourneyId: "mockGovukSigninJourneyId",
          clientId: "mockClientId",
          getNowInMilliseconds: () => 1609462861,
          componentId: "mockComponentId",
        });

        expect(result.isError).toBe(false);
        expect(result.value).toEqual(null);
      });
    });
  });
});
