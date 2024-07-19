import { EventService } from "./eventWriter";
import { mockClient } from "aws-sdk-client-mock";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { sqsClient } from "./sqsClient";

describe("Event Service", () => {
  describe("Writing to sqs", () => {
    describe("Given writing to SQS fails", () => {
      it("Returns a log", async () => {
        const sqsMock = mockClient(sqsClient);
        const eventWriter = new EventService("mockSqsQueue");
        sqsMock.on(SendMessageCommand).rejects("Failed to write to SQS");

        const result = await eventWriter.writeEvent("DCMAW_ASYNC_CRI_5XXERROR");

        expect(result.isError).toBe(true);
        expect(result.value).toEqual("Failed to write to SQS");
      });
    });

    // describe("Given writing to SQS successfully", () => {
    //   it("Returns a log", async () => {
    //     const eventWriter = new EventService("mockSqsQueue")

    //     const result = await eventWriter.writeEvent("DCMAW_ASYNC_CRI_5XXERROR")

    //     expect(result.isError).toBe(false)
    //     expect(result.value).toEqual(null)
    //   })
    // })
  });
});
