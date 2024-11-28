import { SQSEvent } from "aws-lambda";
import { lambdaHandler } from "./dequeueTxmaEventsHandler";

describe("Dequeue TxMA events", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Given one message is sent in the request", () => {
    it("Returns the messageId and event_name for each message", async () => {
      const consoleLogSpy = jest.spyOn(global.console, "log");
      const event: SQSEvent = {
        Records: [
          {
            messageId: "E8CA2168-36C2-4CAF-8CAC-9915B849E1E5",
            receiptHandle: "AQEBwJnKyrHigUMZj6rYigCgxlaS3SLy0a...",
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
        ],
      };

      await lambdaHandler(event);

      expect(consoleLogSpy).toHaveBeenNthCalledWith(2, [
        {
          messageId: "E8CA2168-36C2-4CAF-8CAC-9915B849E1E5",
          event_name: "MOCK_EVENT_NAME",
        },
      ]);
    });
  });

  describe("Given more than one message in the request", () => {
    it("Returns the messageId and event_name for each message", async () => {
      const consoleLogSpy = jest.spyOn(global.console, "log");
      const event: SQSEvent = {
        Records: [
          {
            messageId: "E8CA2168-36C2-4CAF-8CAC-9915B849E1E5",
            receiptHandle: "AQEBwJnKyrHigUMZj6rYigCgxlaS3SLy0a...",
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
            receiptHandle: "AQEBwJnKyrHigUMZj6rYigCgxlaS3SLy0a...",
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
          event_name: "MOCK_EVENT_NAME",
        },
        {
          messageId: "4008E4FD-10A1-461F-9B34-910BCE726C55",
          event_name: "MOCK_EVENT_NAME_2",
        },
      ]);
    });
  });
});
