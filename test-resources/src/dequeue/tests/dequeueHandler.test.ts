import {
  DynamoDBClient,
  DynamoDBClientResolvedConfig,
  PutItemCommand,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "@aws-sdk/client-dynamodb";
import { SQSEvent } from "aws-lambda";
import { AwsStub, mockClient } from "aws-sdk-client-mock";
import "aws-sdk-client-mock-jest";
import { Logger } from "../../services/logging/logger";
import { buildLambdaContext } from "../../services/logging/tests/mockContext";
import { MockLoggingAdapter } from "../../services/logging/tests/mockLogger";
import {
  IDequeueDependencies,
  lambdaHandlerConstructor,
} from "../dequeueHandler";
import { MessageName, registeredLogs } from "../registeredLogs";
import {
  eventNameMissingSQSRecord,
  eventNameNotAllowedSQSRecord,
  invalidBodySQSRecord,
  invalidSessionId,
  invalidSessionIdSQSRecord,
  missingSessionIdSQSRecord,
  missingTimestampSQSRecord,
  missingUserSQSRecord,
  notAllowedEventName,
  passingEventName,
  passingSessionId,
  passingSQSRecord,
} from "./testData";

jest.useFakeTimers().setSystemTime(new Date("2025-01-08"));

const env = {
  EVENTS_TABLE_NAME: "mock-table-name",
  TXMA_EVENT_TTL_DURATION_IN_SECONDS: "3600",
};

describe("Dequeue TxMA events", () => {
  let dependencies: IDequeueDependencies;
  let mockLogger: MockLoggingAdapter<MessageName>;
  let mockDbClient: AwsStub<
    ServiceInputTypes,
    ServiceOutputTypes,
    DynamoDBClientResolvedConfig
  >;

  beforeEach(() => {
    mockLogger = new MockLoggingAdapter();
    mockDbClient = mockClient(DynamoDBClient);
    mockDbClient.on(PutItemCommand).resolves({});
    dependencies = {
      env,
      logger: () => new Logger(mockLogger, registeredLogs),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Environment variable validation", () => {
    describe.each(Object.keys(env))("Given %s is missing", (envVar: string) => {
      it("Returns a 500 Server Error response", async () => {
        const event: SQSEvent = {
          Records: [],
        };
        dependencies.env = JSON.parse(JSON.stringify(env));
        delete dependencies.env[envVar];

        await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages()[1].logMessage.message).toBe(
          "ENVIRONMENT_VARIABLE_MISSING",
        );
        expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
          errorMessage: `Missing environment variable: ${envVar}`,
        });
      });
    });
  });

  describe("Given there are no messages to be processed", () => {
    it("Logs an error message", async () => {
      mockDbClient.on(PutItemCommand).rejects("Error writing to database");
      const event: SQSEvent = {
        Records: [],
      };

      await lambdaHandlerConstructor(dependencies, event, buildLambdaContext());

      expect(mockLogger.getLogMessages().length).toEqual(3);
      expect(mockLogger.getLogMessages()[0].logMessage.message).toEqual(
        "STARTED",
      );
      expect(mockLogger.getLogMessages()[1].logMessage.message).toEqual(
        "PROCESSED_MESSAGES",
      );
      expect(mockLogger.getLogMessages()[1].data).toEqual({
        processedMessages: [],
      });
      expect(mockLogger.getLogMessages()[2].logMessage.message).toEqual(
        "COMPLETED",
      );
    });
  });

  describe("Message validation", () => {
    describe("Given there is an error parsing the record body", () => {
      it("Logs an error message", async () => {
        const event: SQSEvent = {
          Records: [invalidBodySQSRecord, passingSQSRecord],
        };

        await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages().length).toEqual(4);
        expect(mockLogger.getLogMessages()[1].logMessage.messageCode).toEqual(
          "DEQUEUE_FAILED_TO_PROCESS_MESSAGES",
        );
        expect(mockLogger.getLogMessages()[1].data.errorMessage).toEqual(
          "Failed to process message - messageId: 54D7CA2F-BE1D-4D55-8F1C-9B3B501C9685",
        );
        expect(mockLogger.getLogMessages()[2].data.processedMessages).toEqual([
          {
            eventName: passingEventName,
            sessionId: passingSessionId,
          },
        ]);
      });
    });

    describe("Given event_name is missing", () => {
      it("Logs an error message", async () => {
        const event: SQSEvent = {
          Records: [eventNameMissingSQSRecord],
        };

        await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages().length).toEqual(4);
        expect(mockLogger.getLogMessages()[1].logMessage.messageCode).toEqual(
          "DEQUEUE_FAILED_TO_PROCESS_MESSAGES",
        );
        expect(mockLogger.getLogMessages()[1].data.errorMessage).toEqual(
          "Missing event_name",
        );
        expect(mockLogger.getLogMessages()[2].logMessage.message).toStrictEqual(
          "PROCESSED_MESSAGES",
        );
        expect(mockLogger.getLogMessages()[2].data).toStrictEqual({
          processedMessages: [],
        });
      });
    });

    describe("Given the event_name is not allowed", () => {
      it("Logs an error message", async () => {
        const event: SQSEvent = {
          Records: [eventNameNotAllowedSQSRecord],
        };

        await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages().length).toEqual(4);
        expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "event_name not allowed",
          eventName: notAllowedEventName,
        });
        expect(mockLogger.getLogMessages()[2].logMessage.message).toStrictEqual(
          "PROCESSED_MESSAGES",
        );
        expect(mockLogger.getLogMessages()[2].data).toStrictEqual({
          processedMessages: [],
        });
      });
    });

    describe("Given user is missing", () => {
      it("Logs an error message", async () => {
        const event: SQSEvent = {
          Records: [missingUserSQSRecord],
        };

        await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages().length).toEqual(4);
        expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "Missing user",
          eventName: passingEventName,
        });
        expect(mockLogger.getLogMessages()[2].logMessage.message).toStrictEqual(
          "PROCESSED_MESSAGES",
        );
        expect(mockLogger.getLogMessages()[2].data).toStrictEqual({
          processedMessages: [],
        });
      });
    });

    describe("Given session_id is missing", () => {
      it("Logs an error message", async () => {
        const event: SQSEvent = {
          Records: [missingSessionIdSQSRecord],
        };

        await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages().length).toEqual(4);
        expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "Missing session_id",
          eventName: passingEventName,
        });
        expect(mockLogger.getLogMessages()[2].logMessage.message).toStrictEqual(
          "PROCESSED_MESSAGES",
        );
        expect(mockLogger.getLogMessages()[2].data).toStrictEqual({
          processedMessages: [],
        });
      });
    });

    describe("Given session_id is not valid", () => {
      it("Logs an error message", async () => {
        const event: SQSEvent = {
          Records: [invalidSessionIdSQSRecord],
        };

        await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages().length).toEqual(4);
        expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "session_id not valid",
          eventName: passingEventName,
          sessionId: invalidSessionId,
        });
        expect(mockLogger.getLogMessages()[2].logMessage.message).toStrictEqual(
          "PROCESSED_MESSAGES",
        );
        expect(mockLogger.getLogMessages()[2].data).toStrictEqual({
          processedMessages: [],
        });
      });
    });

    describe("Given timestamp is missing", () => {
      it("Logs an error message", async () => {
        const event: SQSEvent = {
          Records: [missingTimestampSQSRecord],
        };

        await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages().length).toEqual(4);
        expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "Missing timestamp",
          eventName: passingEventName,
        });
        expect(mockLogger.getLogMessages()[2].logMessage.message).toStrictEqual(
          "PROCESSED_MESSAGES",
        );
        expect(mockLogger.getLogMessages()[2].data).toStrictEqual({
          processedMessages: [],
        });
      });
    });
  });

  describe("Given multiple messages are sent in the request", () => {
    const event: SQSEvent = {
      Records: [
        {
          messageId: "E8CA2168-36C2-4CAF-8CAC-9915B849E1E5",
          receiptHandle: "mockReceiptHandle",
          body: JSON.stringify({
            event_name: "DCMAW_APP_HANDOFF_START",
            user: {
              session_id: "49E7D76E-D5FE-4355-B8B4-E90ACA0887C2",
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
            event_name: "DCMAW_APP_END",
            user: {
              session_id: "41AA5FE7-CD9D-4B5B-960C-1E33C165B592",
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
        await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages().length).toEqual(4);
        expect(mockLogger.getLogMessages()[1].data.errorMessage).toEqual(
          "Failed to process message - messageId: D8B937B7-7E1D-4D37-BD82-C6AED9F7D975",
        );
      });

      it("Makes a call to the database client", async () => {
        await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );
        expect(mockDbClient).toHaveReceivedCommandTimes(PutItemCommand, 2);
        expect(mockDbClient).toHaveReceivedNthCommandWith(1, PutItemCommand, {
          Item: {
            pk: { S: "SESSION#49E7D76E-D5FE-4355-B8B4-E90ACA0887C2" },
            sk: {
              S: "TXMA#EVENT_NAME#DCMAW_APP_HANDOFF_START#TIMESTAMP#mockTimestamp",
            },
            eventBody: {
              S: JSON.stringify({
                event_name: "DCMAW_APP_HANDOFF_START",
                user: {
                  session_id: "49E7D76E-D5FE-4355-B8B4-E90ACA0887C2",
                },
                timestamp: "mockTimestamp",
              }),
            },
            timeToLiveInSeconds: { N: "1736298000" },
          },
        });
        expect(mockDbClient).toHaveReceivedNthCommandWith(2, PutItemCommand, {
          Item: {
            pk: { S: "SESSION#41AA5FE7-CD9D-4B5B-960C-1E33C165B592" },
            sk: {
              S: "TXMA#EVENT_NAME#DCMAW_APP_END#TIMESTAMP#mockTimestamp",
            },
            eventBody: {
              S: JSON.stringify({
                event_name: "DCMAW_APP_END",
                user: {
                  session_id: "41AA5FE7-CD9D-4B5B-960C-1E33C165B592",
                },
                timestamp: "mockTimestamp",
              }),
            },
            timeToLiveInSeconds: { N: "1736298000" },
          },
        });
      });

      it("Logs successfully processed messages", async () => {
        await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages()[2].data.processedMessages).toEqual([
          {
            Item: {
              pk: { S: "SESSION#49E7D76E-D5FE-4355-B8B4-E90ACA0887C2" },
              sk: {
                S: "TXMA#EVENT_NAME#DCMAW_APP_HANDOFF_START#TIMESTAMP#mockTimestamp",
              },
              eventBody: {
                S: JSON.stringify({
                  event_name: "DCMAW_APP_HANDOFF_START",
                  user: {
                    session_id: "49E7D76E-D5FE-4355-B8B4-E90ACA0887C2",
                  },
                  timestamp: "mockTimestamp",
                }),
              },
              timeToLiveInSeconds: { N: "1736298000" },
            },
          },
          {
            Item: {
              pk: { S: "SESSION#41AA5FE7-CD9D-4B5B-960C-1E33C165B592" },
              sk: {
                S: "TXMA#EVENT_NAME#DCMAW_APP_END#TIMESTAMP#mockTimestamp",
              },
              eventBody: {
                S: JSON.stringify({
                  event_name: "DCMAW_APP_END",
                  user: {
                    session_id: "41AA5FE7-CD9D-4B5B-960C-1E33C165B592",
                  },
                  timestamp: "mockTimestamp",
                }),
              },
              timeToLiveInSeconds: { N: "1736298000" },
            },
          },
        ]);
      });

      it("Returns batch item failures", async () => {
        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(result).toStrictEqual({
          batchItemFailures: [
            { itemIdentifier: "D8B937B7-7E1D-4D37-BD82-C6AED9F7D975" },
          ],
        });
      });
    });

    describe("Given there is an unexpected error writing an event to the database", () => {
      it("Logs an error message", async () => {
        mockDbClient.on(PutItemCommand).rejects("Error writing to database");
        const event: SQSEvent = {
          Records: [
            {
              messageId: "E8CA2168-36C2-4CAF-8CAC-9915B849E1E5",
              receiptHandle: "mockReceiptHandle",
              body: JSON.stringify({
                event_name: "DCMAW_APP_HANDOFF_START",
                user: {
                  session_id: "49E7D76E-D5FE-4355-B8B4-E90ACA0887C2",
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

        await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages().length).toEqual(4);
        expect(mockLogger.getLogMessages()[1].logMessage.message).toStrictEqual(
          "ERROR_WRITING_EVENT_TO_EVENTS_TABLE",
        );
        expect(mockLogger.getLogMessages()[1].data.eventName).toStrictEqual(
          "DCMAW_APP_HANDOFF_START",
        );
        expect(mockLogger.getLogMessages()[1].data.sessionId).toStrictEqual(
          "49E7D76E-D5FE-4355-B8B4-E90ACA0887C2",
        );
        expect(mockLogger.getLogMessages()[2].logMessage.message).toStrictEqual(
          "PROCESSED_MESSAGES",
        );
        expect(mockLogger.getLogMessages()[2].data).toStrictEqual({
          processedMessages: [],
        });
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
                event_name: "DCMAW_APP_HANDOFF_START",
                user: {
                  session_id: "49E7D76E-D5FE-4355-B8B4-E90ACA0887C2",
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
                event_name: "DCMAW_APP_END",
                user: {
                  session_id: "41AA5FE7-CD9D-4B5B-960C-1E33C165B592",
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

        await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages().length).toEqual(3);
        expect(mockLogger.getLogMessages()[1].data.processedMessages).toEqual([
          {
            Item: {
              pk: { S: "SESSION#49E7D76E-D5FE-4355-B8B4-E90ACA0887C2" },
              sk: {
                S: "TXMA#EVENT_NAME#DCMAW_APP_HANDOFF_START#TIMESTAMP#mockTimestamp",
              },
              eventBody: {
                S: JSON.stringify({
                  event_name: "DCMAW_APP_HANDOFF_START",
                  user: {
                    session_id: "49E7D76E-D5FE-4355-B8B4-E90ACA0887C2",
                  },
                  timestamp: "mockTimestamp",
                }),
              },
              timeToLiveInSeconds: { N: "1736298000" },
            },
          },
          {
            Item: {
              pk: { S: "SESSION#41AA5FE7-CD9D-4B5B-960C-1E33C165B592" },
              sk: {
                S: "TXMA#EVENT_NAME#DCMAW_APP_END#TIMESTAMP#mockTimestamp",
              },
              eventBody: {
                S: JSON.stringify({
                  event_name: "DCMAW_APP_END",
                  user: {
                    session_id: "41AA5FE7-CD9D-4B5B-960C-1E33C165B592",
                  },
                  timestamp: "mockTimestamp",
                }),
              },
              timeToLiveInSeconds: { N: "1736298000" },
            },
          },
        ]);
      });
    });
  });
});
