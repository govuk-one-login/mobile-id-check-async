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
  failingSQSRecordMessageId,
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
  putItemInputForPassingSQSRecord,
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

      const result = await lambdaHandlerConstructor(
        dependencies,
        event,
        buildLambdaContext(),
      );

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
      expect(result).toStrictEqual({ batchItemFailures: [] });
    });
  });

  describe("Message validation", () => {
    describe("Given there is an error parsing the record body", () => {
      it("Logs an error message", async () => {
        const event: SQSEvent = {
          Records: [invalidBodySQSRecord],
        };

        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages().length).toEqual(4);
        expect(mockLogger.getLogMessages()[1].logMessage.messageCode).toEqual(
          "DEQUEUE_FAILED_TO_PROCESS_MESSAGES",
        );
        expect(mockLogger.getLogMessages()[1].data.errorMessage).toEqual(
          `Failed to process message - messageId: ${failingSQSRecordMessageId}`,
        );
        expect(mockLogger.getLogMessages()[1].data.body).toEqual("{");
        expect(result).toStrictEqual({
          batchItemFailures: [
            { itemIdentifier: failingSQSRecordMessageId },
          ],
        });
        expect(mockLogger.getLogMessages()[2].data.processedMessages).toEqual([]);
      });
    });

    describe("Given event_name is missing", () => {
      it("Logs an error message", async () => {
        const event: SQSEvent = {
          Records: [eventNameMissingSQSRecord],
        };

        const result = await lambdaHandlerConstructor(
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
        expect(result).toStrictEqual({
          batchItemFailures: [
            { itemIdentifier: "E8CA2168-36C2-4CAF-8CAC-9915B849E1E5" },
          ],
        });
      });
    });

    describe("Given the event_name is not allowed", () => {
      it("Logs an error message", async () => {
        const event: SQSEvent = {
          Records: [eventNameNotAllowedSQSRecord],
        };

        const result = await lambdaHandlerConstructor(
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
        expect(result).toStrictEqual({
          batchItemFailures: [
            { itemIdentifier: "E8CA2168-36C2-4CAF-8CAC-9915B849E1E5" },
          ],
        });
      });
    });

    describe("Given user is missing", () => {
      it("Logs an error message", async () => {
        const event: SQSEvent = {
          Records: [missingUserSQSRecord],
        };

        const result = await lambdaHandlerConstructor(
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
        expect(result).toStrictEqual({
          batchItemFailures: [
            { itemIdentifier: "E8CA2168-36C2-4CAF-8CAC-9915B849E1E5" },
          ],
        });
      });
    });

    describe("Given session_id is missing", () => {
      it("Logs an error message", async () => {
        const event: SQSEvent = {
          Records: [missingSessionIdSQSRecord],
        };

        const result = await lambdaHandlerConstructor(
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
        expect(result).toStrictEqual({
          batchItemFailures: [
            { itemIdentifier: "E8CA2168-36C2-4CAF-8CAC-9915B849E1E5" },
          ],
        });
      });
    });

    describe("Given session_id is not valid", () => {
      it("Logs an error message", async () => {
        const event: SQSEvent = {
          Records: [invalidSessionIdSQSRecord],
        };

        const result = await lambdaHandlerConstructor(
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
        expect(mockLogger.getLogMessages()[2].logMessage.message).toStrictEqual(
          "PROCESSED_MESSAGES",
        );
        expect(mockLogger.getLogMessages()[2].data).toStrictEqual({
          processedMessages: [],
        });
        expect(result).toStrictEqual({
          batchItemFailures: [
            { itemIdentifier: "E8CA2168-36C2-4CAF-8CAC-9915B849E1E5" },
          ],
        });
      });
    });

    describe("Given timestamp is missing", () => {
      it("Logs an error message", async () => {
        const event: SQSEvent = {
          Records: [missingTimestampSQSRecord],
        };

        const result = await lambdaHandlerConstructor(
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
        expect(mockLogger.getLogMessages()[2].logMessage.message).toStrictEqual(
          "PROCESSED_MESSAGES",
        );
        expect(mockLogger.getLogMessages()[2].data).toStrictEqual({
          processedMessages: [],
        });
        expect(result).toStrictEqual({
          batchItemFailures: [
            { itemIdentifier: "E8CA2168-36C2-4CAF-8CAC-9915B849E1E5" },
          ],
        });
      });
    });
  });

  describe("Given multiple messages are sent in the request", () => {
    const event: SQSEvent = {
      Records: [passingSQSRecord, passingSQSRecord, invalidBodySQSRecord],
    };

    describe("Given one out of three messages fails to be processed", () => {
      it("Logs the messageId of messages that failed to be processed", async () => {
        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages().length).toEqual(4);
        expect(mockLogger.getLogMessages()[1].data.errorMessage).toEqual(
          `Failed to process message - messageId: ${failingSQSRecordMessageId}`,
        );
        expect(result).toStrictEqual({
          batchItemFailures: [
            { itemIdentifier: "D8B937B7-7E1D-4D37-BD82-C6AED9F7D975" },
          ],
        });
      });

      it("Makes a call to the database client", async () => {
        await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );
        expect(mockDbClient).toHaveReceivedCommandTimes(PutItemCommand, 2);
        expect(mockDbClient).toHaveReceivedNthCommandWith(
          1,
          PutItemCommand,
          putItemInputForPassingSQSRecord,
        );
        expect(mockDbClient).toHaveReceivedNthCommandWith(
          2,
          PutItemCommand,
          putItemInputForPassingSQSRecord,
        );
      });

      it("Logs successfully processed messages", async () => {
        await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages()[2].data.processedMessages).toEqual([
          {
            eventName: passingEventName,
            sessionId: passingSessionId,
          },
          {
            eventName: passingEventName,
            sessionId: passingSessionId,
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
            { itemIdentifier: failingSQSRecordMessageId },
          ],
        });
      });
    });

    describe("Given there is an unexpected error writing an event to the database", () => {
      it("Logs an error message", async () => {
        mockDbClient.on(PutItemCommand).rejects("Error writing to database");
        const event: SQSEvent = {
          Records: [passingSQSRecord],
        };

        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages().length).toEqual(4);
        expect(mockLogger.getLogMessages()[1].logMessage.message).toStrictEqual(
          "ERROR_WRITING_EVENT_TO_EVENTS_TABLE",
        );
        expect(mockLogger.getLogMessages()[1].data.eventName).toStrictEqual(
          passingEventName,
        );
        expect(mockLogger.getLogMessages()[1].data.sessionId).toStrictEqual(
          passingSessionId,
        );
        expect(mockLogger.getLogMessages()[2].logMessage.message).toStrictEqual(
          "PROCESSED_MESSAGES",
        );
        expect(mockLogger.getLogMessages()[2].data).toStrictEqual({
          processedMessages: [],
        });
        expect(result).toStrictEqual({
          batchItemFailures: [
            { itemIdentifier: "E8CA2168-36C2-4CAF-8CAC-9915B849E1E5" },
          ],
        });
      });
    });

    describe("Given all messages are processed successfully", () => {
      it("Logs the messageId and event_name for each message", async () => {
        const event: SQSEvent = {
          Records: [passingSQSRecord, passingSQSRecord],
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
                  event_name: passingEventName,
                  user: {
                    session_id: passingSessionId,
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
          putItemInputForPassingSQSRecord,
          putItemInputForPassingSQSRecord,
        ]);
      });
    });
  });
});
