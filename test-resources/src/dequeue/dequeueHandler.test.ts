import { SQSEvent } from "aws-lambda";
import { lambdaHandler } from "./dequeueHandler";

describe("Dequeue TxMA events", () => {
  let consoleLogSpy: jest.SpyInstance

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(global.console, "log")
  })

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Given there is an error parsing the record body", () => {
    it("Returns an error message", async () => {
      const event: SQSEvent = {
        Records: [
          {
            messageId: "D8B937B7-7E1D-4D37-BD82-C6AED9F7D975",
            receiptHandle: "mockReceiptHandle",
            body: "{",
            attributes: {
              ApproximateReceiveCount: "1",
              SentTimestamp: "1545082649183",
              SenderId: "AIDAIENQZJOLO23YVJ4VO",
              ApproximateFirstReceiveTimestamp: "1545082649185",
            },
            messageAttributes: {},
            md5OfBody: "098f6bcd4621d373cade4e832627b4f6",
            eventSource: "aws:sqs",
            eventSourceARN: "arn:aws:sqs:eu-west-2:111122223333:my-queue",
            awsRegion: "eu-west-2",
          },
        ],
      };

      await lambdaHandler(event);

      expect(consoleLogSpy).toHaveBeenNthCalledWith(2, "Failed to process message - messageId: D8B937B7-7E1D-4D37-BD82-C6AED9F7D975");
    })
  })

  describe("Given multiple messages are sent in the request", () => {
    describe("Given one out of three messages fails to be processed", () => {
      it("Logs successfully processed messages and returns failed messages", async () => {
        const event: SQSEvent = {
          Records: [
            {
              messageId: "E8CA2168-36C2-4CAF-8CAC-9915B849E1E5",
              receiptHandle: "mockReceiptHandle",
              body: JSON.stringify({
                event_name: "MOCK_EVENT_NAME",
              }),
              attributes: {
                ApproximateReceiveCount: "1",
                SentTimestamp: "1545082649183",
                SenderId: "AIDAIENQZJOLO23YVJ4VO",
                ApproximateFirstReceiveTimestamp: "1545082649185",
              },
              messageAttributes: {},
              md5OfBody: "098f6bcd4621d373cade4e832627b4f6",
              eventSource: "aws:sqs",
              eventSourceARN: "arn:aws:sqs:eu-west-2:111122223333:my-queue",
              awsRegion: "eu-west-2",
            },
            {
              messageId: "D8B937B7-7E1D-4D37-BD82-C6AED9F7D975",
              receiptHandle: "mockReceiptHandle",
              body: "error",
              attributes: {
                ApproximateReceiveCount: "1",
                SentTimestamp: "1545082649183",
                SenderId: "AIDAIENQZJOLO23YVJ4VO",
                ApproximateFirstReceiveTimestamp: "1545082649185",
              },
              messageAttributes: {},
              md5OfBody: "098f6bcd4621d373cade4e832627b4f6",
              eventSource: "aws:sqs",
              eventSourceARN: "arn:aws:sqs:eu-west-2:111122223333:my-queue",
              awsRegion: "eu-west-2",
            },
            {
              messageId: "4008E4FD-10A1-461F-9B34-910BCE726C55",
              receiptHandle: "mockReceiptHandle",
              body: JSON.stringify({
                event_name: "MOCK_EVENT_NAME_2",
              }),
              attributes: {
                ApproximateReceiveCount: "1",
                SentTimestamp: "1545082649183",
                SenderId: "AIDAIENQZJOLO23YVJ4VO",
                ApproximateFirstReceiveTimestamp: "1545082649185",
              },
              messageAttributes: {},
              md5OfBody: "098f6bcd4621d373cade4e832627b4f6",
              eventSource: "aws:sqs",
              eventSourceARN: "arn:aws:sqs:eu-west-2:111122223333:my-queue",
              awsRegion: "eu-west-2",
            },
          ],
        };

        const result = await lambdaHandler(event);

        expect(consoleLogSpy).toHaveBeenNthCalledWith(
          2,
          "Failed to process message - messageId: D8B937B7-7E1D-4D37-BD82-C6AED9F7D975"
        )
        expect(consoleLogSpy).toHaveBeenNthCalledWith(
          3,
          [
            {
              messageId: "E8CA2168-36C2-4CAF-8CAC-9915B849E1E5",
              eventName: "MOCK_EVENT_NAME",
            },
            {
              messageId: "4008E4FD-10A1-461F-9B34-910BCE726C55",
              eventName: "MOCK_EVENT_NAME_2",
            },
          ]
        );
        expect(result).toStrictEqual({
          batchItemFailures: []
        })
      });
    })

    describe("Given all messages are processed successfully", () => {
      it("Returns the messageId and event_name for each message", async () => {
        const event: SQSEvent = {
          Records: [
            {
              messageId: "E8CA2168-36C2-4CAF-8CAC-9915B849E1E5",
              receiptHandle: "mockReceiptHandle",
              body: JSON.stringify({
                event_name: "MOCK_EVENT_NAME",
              }),
              attributes: {
                ApproximateReceiveCount: "1",
                SentTimestamp: "1545082649183",
                SenderId: "AIDAIENQZJOLO23YVJ4VO",
                ApproximateFirstReceiveTimestamp: "1545082649185",
              },
              messageAttributes: {},
              md5OfBody: "098f6bcd4621d373cade4e832627b4f6",
              eventSource: "aws:sqs",
              eventSourceARN: "arn:aws:sqs:eu-west-2:111122223333:my-queue",
              awsRegion: "eu-west-2",
            },
            {
              messageId: "4008E4FD-10A1-461F-9B34-910BCE726C55",
              receiptHandle: "mockReceiptHandle",
              body: JSON.stringify({
                event_name: "MOCK_EVENT_NAME_2",
              }),
              attributes: {
                ApproximateReceiveCount: "1",
                SentTimestamp: "1545082649183",
                SenderId: "AIDAIENQZJOLO23YVJ4VO",
                ApproximateFirstReceiveTimestamp: "1545082649185",
              },
              messageAttributes: {},
              md5OfBody: "098f6bcd4621d373cade4e832627b4f6",
              eventSource: "aws:sqs",
              eventSourceARN: "arn:aws:sqs:eu-west-2:111122223333:my-queue",
              awsRegion: "eu-west-2",
            },
          ],
        };

        await lambdaHandler(event);

        expect(consoleLogSpy).toHaveBeenNthCalledWith(2, [
          {
            messageId: "E8CA2168-36C2-4CAF-8CAC-9915B849E1E5",
            eventName: "MOCK_EVENT_NAME",
          },
          {
            messageId: "4008E4FD-10A1-461F-9B34-910BCE726C55",
            eventName: "MOCK_EVENT_NAME_2",
          },
        ]);
      });
    })
  });
});
