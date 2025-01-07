import { SQSEvent } from "aws-lambda";
import { ddbAdapter } from "../../adapters/dynamoDbAdapter";
import { lambdaHandler } from "./dequeueHandler";

describe("Dequeue TxMA events", () => {
  let consoleLogSpy: jest.SpyInstance;
  let ddbAdapterSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(global.console, "log");
    ddbAdapterSpy = jest
      .spyOn(ddbAdapter, "send")
      .mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Given there are no messages to be processed", () => {
    it("Logs an empty array", async () => {
      const event: SQSEvent = {
        Records: [],
      };

      await lambdaHandler(event);

      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
      expect(consoleLogSpy).toHaveBeenNthCalledWith(1, "STARTED");
      expect(consoleLogSpy).toHaveBeenNthCalledWith(2, []);
      expect(consoleLogSpy).toHaveBeenNthCalledWith(3, "COMPLETED");
    });
  });

  describe("Given there is an error parsing the record body", () => {
    it("Logs an error message", async () => {
      const event: SQSEvent = {
        Records: [
          {
            messageId: "54D7CA2F-BE1D-4D55-8F1C-9B3B501C9685",
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
          {
            messageId: "E8CA2168-36C2-4CAF-8CAC-9915B849E1E5",
            receiptHandle: "mockReceiptHandle",
            body: JSON.stringify({
              event_name: "MOCK_EVENT_NAME",
              user: {
                session_id: "mockSessionId",
              },
              timestamp: "mockTimestamp",
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

      expect(consoleLogSpy).toHaveBeenCalledTimes(5);
      expect(consoleLogSpy).toHaveBeenNthCalledWith(
        2,
        "Failed to process message - messageId: 54D7CA2F-BE1D-4D55-8F1C-9B3B501C9685",
      );
      expect(consoleLogSpy).toHaveBeenNthCalledWith(
        3,
        "Failed to process message - messageId: D8B937B7-7E1D-4D37-BD82-C6AED9F7D975",
      );
      expect(consoleLogSpy).toHaveBeenNthCalledWith(4, [
        {
          PutRequest: {
            Item: {
              pk: { S: "TXMA#mockSessionId" },
              sk: {
                S: "MOCK_EVENT_NAME#mockTimestamp",
              },
              eventBody: {
                S: JSON.stringify({
                  event_name: "MOCK_EVENT_NAME",
                  user: {
                    session_id: "mockSessionId",
                  },
                  timestamp: "mockTimestamp",
                }),
              },
            },
          },
        },
      ]);
    });
  });

  describe("Given multiple messages are sent in the request", () => {
    describe("Given one out of three messages fails to be processed", () => {
      it("Logs successfully processed messages", async () => {
        const event: SQSEvent = {
          Records: [
            {
              messageId: "E8CA2168-36C2-4CAF-8CAC-9915B849E1E5",
              receiptHandle: "mockReceiptHandle",
              body: JSON.stringify({
                event_name: "MOCK_EVENT_NAME",
                user: {
                  session_id: "mockSessionId",
                },
                timestamp: "mockTimestamp",
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
                user: {
                  session_id: "mockSessionId",
                },
                timestamp: "mockTimestamp",
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

        expect(consoleLogSpy).toHaveBeenCalledTimes(4);
        expect(consoleLogSpy).toHaveBeenNthCalledWith(
          2,
          "Failed to process message - messageId: D8B937B7-7E1D-4D37-BD82-C6AED9F7D975",
        );
        expect(consoleLogSpy).toHaveBeenNthCalledWith(3, [
          {
            PutRequest: {
              Item: {
                pk: { S: "TXMA#mockSessionId" },
                sk: {
                  S: "MOCK_EVENT_NAME#mockTimestamp",
                },
                eventBody: {
                  S: JSON.stringify({
                    event_name: "MOCK_EVENT_NAME",
                    user: {
                      session_id: "mockSessionId",
                    },
                    timestamp: "mockTimestamp",
                  }),
                },
              },
            },
          },
          {
            PutRequest: {
              Item: {
                pk: { S: "TXMA#mockSessionId" },
                sk: {
                  S: "MOCK_EVENT_NAME_2#mockTimestamp",
                },
                eventBody: {
                  S: JSON.stringify({
                    event_name: "MOCK_EVENT_NAME_2",
                    user: {
                      session_id: "mockSessionId",
                    },
                    timestamp: "mockTimestamp",
                  }),
                },
              },
            },
          },
        ]);
      });
    });

    describe("Given all messages are processed successfully", () => {
      it("Logs the messageId and event_name for each message", async () => {
        const event: SQSEvent = {
          Records: [
            {
              messageId: "E8CA2168-36C2-4CAF-8CAC-9915B849E1E5",
              receiptHandle: "mockReceiptHandle",
              body: JSON.stringify({
                event_name: "MOCK_EVENT_NAME",
                user: {
                  session_id: "mockSessionId",
                },
                timestamp: "mockTimestamp",
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
                user: {
                  session_id: "mockSessionId",
                },
                timestamp: "mockTimestamp",
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

        expect(consoleLogSpy).toHaveBeenCalledTimes(3);
        expect(consoleLogSpy).toHaveBeenNthCalledWith(2, [
          {
            PutRequest: {
              Item: {
                pk: { S: "TXMA#mockSessionId" },
                sk: {
                  S: "MOCK_EVENT_NAME#mockTimestamp",
                },
                eventBody: {
                  S: JSON.stringify({
                    event_name: "MOCK_EVENT_NAME",
                    user: {
                      session_id: "mockSessionId",
                    },
                    timestamp: "mockTimestamp",
                  }),
                },
              },
            },
          },
          {
            PutRequest: {
              Item: {
                pk: { S: "TXMA#mockSessionId" },
                sk: {
                  S: "MOCK_EVENT_NAME_2#mockTimestamp",
                },
                eventBody: {
                  S: JSON.stringify({
                    event_name: "MOCK_EVENT_NAME_2",
                    user: {
                      session_id: "mockSessionId",
                    },
                    timestamp: "mockTimestamp",
                  }),
                },
              },
            },
          },
        ]);
      });
    });
  });
});
