import { SQSEvent } from "aws-lambda";
import { IDynamoDBAdapter } from "../adapters/dynamoDbAdapter";
import { Logger } from "../services/logging/logger";
import { MockLoggingAdapter } from "../services/logging/tests/mockLogger";
import {
  IDequeueDependencies,
  lambdaHandlerConstructor,
} from "./dequeueHandler";
import { MessageName, registeredLogs } from "./registeredLogs";

describe("Dequeue TxMA events", () => {
  let dependencies: IDequeueDependencies;
  let mockLogger: MockLoggingAdapter<MessageName>;

  beforeEach(() => {
    mockLogger = new MockLoggingAdapter();
    dependencies = {
      logger: () => new Logger(mockLogger, registeredLogs),
      dbAdapter: () => new MockDBAdapterSuccessResponse(),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Given there are no messages to be processed", () => {
    it("Logs an empty array", async () => {
      dependencies.dbAdapter = () => new MockDBAdapterErrorResponse();
      const event: SQSEvent = {
        Records: [],
      };

      await lambdaHandlerConstructor(dependencies, event);

      expect(mockLogger.getLogMessages().length).toEqual(4);
      expect(mockLogger.getLogMessages()[0].logMessage.message).toEqual(
        "STARTED",
      );
      expect(mockLogger.getLogMessages()[1].data.messages).toEqual([]);
      expect(mockLogger.getLogMessages()[2].data.errorMessage).toEqual(
        "Error writing to database",
      );
      expect(mockLogger.getLogMessages()[3].logMessage.message).toBe(
        "COMPLETED",
      );
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

      await lambdaHandlerConstructor(dependencies, event);

      expect(mockLogger.getLogMessages().length).toEqual(5);
      expect(mockLogger.getLogMessages()[0].logMessage.message).toEqual(
        "STARTED",
      );
      expect(mockLogger.getLogMessages()[1].data.errorMessage).toEqual(
        "Failed to process message - messageId: 54D7CA2F-BE1D-4D55-8F1C-9B3B501C9685",
      );
      expect(mockLogger.getLogMessages()[2].data.errorMessage).toEqual(
        "Failed to process message - messageId: D8B937B7-7E1D-4D37-BD82-C6AED9F7D975",
      );
      expect(mockLogger.getLogMessages()[3].data.messages).toEqual([
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

    describe("Given one out of three messages fails to be processed", () => {
      it("Logs the messageId of messages that failed to be processed", async () => {
        await lambdaHandlerConstructor(dependencies, event);

        expect(mockLogger.getLogMessages().length).toEqual(4);
        expect(mockLogger.getLogMessages()[1].data.errorMessage).toEqual(
          "Failed to process message - messageId: D8B937B7-7E1D-4D37-BD82-C6AED9F7D975",
        );
      });

      it("Logs successfully processed messages", async () => {
        await lambdaHandlerConstructor(dependencies, event);

        expect(mockLogger.getLogMessages()[2].data.messages).toEqual([
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

      it("Returns batch item failures", async () => {
        const result = await lambdaHandlerConstructor(dependencies, event);

        expect(result).toStrictEqual({
          batchItemFailures: [
            { itemIdentifier: "D8B937B7-7E1D-4D37-BD82-C6AED9F7D975" },
          ],
        });
      });
    });

    describe("Given there is an unexpected error writing events to the database", () => {
      it("Logs an error message", async () => {
        dependencies.dbAdapter = () => new MockDBAdapterErrorResponse();
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
          ],
        };

        await lambdaHandlerConstructor(dependencies, event);

        expect(mockLogger.getLogMessages().length).toEqual(4);
        expect(mockLogger.getLogMessages()[2].data.errorMessage).toEqual(
          "Error writing to database",
        );
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

        await lambdaHandlerConstructor(dependencies, event);

        expect(mockLogger.getLogMessages().length).toEqual(3);
        expect(mockLogger.getLogMessages()[1].data.messages).toEqual([
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

class MockDBAdapterSuccessResponse implements IDynamoDBAdapter {
  async send() {
    return Promise.resolve();
  }
}

class MockDBAdapterErrorResponse implements IDynamoDBAdapter {
  async send() {
    return Promise.resolve("Error writing to database");
  }
}
