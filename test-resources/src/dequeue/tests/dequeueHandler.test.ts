import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { SQSEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
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
  missingSessionIdInvalidSQSRecord,
  missingSessionIdValidSQSRecord,
  missingTimestampSQSRecord,
  notAllowedEventName,
  passingSQSRecord,
  putItemInputForPassingSQSRecord,
  putItemInputForPassingSQSRecordWithoutSessionId,
} from "./testData";

const env = {
  EVENTS_TABLE_NAME: "mock-table-name",
  TXMA_EVENT_TTL_DURATION_IN_SECONDS: "3600",
};

describe("Dequeue TxMA events", () => {
  let dependencies: IDequeueDependencies;
  let mockLogger: MockLoggingAdapter<MessageName>;
  const mockDbClient = mockClient(DynamoDBClient);

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2025-01-08"));
    mockLogger = new MockLoggingAdapter();
    mockDbClient.on(PutItemCommand).resolves({});
    dependencies = {
      env,
      logger: () => new Logger(mockLogger, registeredLogs),
    };
  });

  afterEach(() => {
    jest.useFakeTimers().clearAllTimers();
    jest.restoreAllMocks();
    mockDbClient.reset();
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
    it("Logs an empty array", async () => {
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
          `Failed to process message - messageId: ${invalidBodySQSRecord.messageId}`,
        );
        expect(mockLogger.getLogMessages()[1].data.body).toEqual("{");
        expect(mockLogger.getLogMessages()[2].data.processedMessages).toEqual(
          [],
        );
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

    describe("Given session_id is missing", () => {
      describe("Given the registered event schema does not include a session_id", () => {
        it("Writes to Dynamo using UNKNOWN as the sessionId", async () => {
          const event: SQSEvent = {
            Records: [missingSessionIdValidSQSRecord],
          };

          const result = await lambdaHandlerConstructor(
            dependencies,
            event,
            buildLambdaContext(),
          );

          expect(mockLogger.getLogMessages().length).toEqual(3);
          expect(
            mockLogger.getLogMessages()[1].logMessage.message,
          ).toStrictEqual("PROCESSED_MESSAGES");
          expect(mockLogger.getLogMessages()[1].data.processedMessages).toEqual(
            [
              {
                eventName: JSON.parse(missingSessionIdValidSQSRecord.body)
                  .event_name,
                sessionId: "UNKNOWN",
              },
            ],
          );

          expect(mockDbClient).toHaveReceivedCommandWith(
            PutItemCommand,
            putItemInputForPassingSQSRecordWithoutSessionId,
          );
          expect(result).toStrictEqual({
            batchItemFailures: [],
          });
        });
      });

      describe("Given the registered event schema includes a session_id", () => {
        it("Logs an error message", async () => {
          const event: SQSEvent = {
            Records: [missingSessionIdInvalidSQSRecord],
          };

          await lambdaHandlerConstructor(
            dependencies,
            event,
            buildLambdaContext(),
          );

          expect(mockLogger.getLogMessages().length).toEqual(4);
          expect(
            mockLogger.getLogMessages()[1].logMessage.message,
          ).toStrictEqual("FAILED_TO_PROCESS_MESSAGES");
          expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
            errorMessage: "Missing session_id",
            eventName: JSON.parse(missingSessionIdInvalidSQSRecord.body)
              .event_name,
          });
          expect(
            mockLogger.getLogMessages()[2].logMessage.message,
          ).toStrictEqual("PROCESSED_MESSAGES");
          expect(mockLogger.getLogMessages()[2].data).toStrictEqual({
            processedMessages: [],
          });
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
        expect(mockLogger.getLogMessages()[1].logMessage.message).toStrictEqual(
          "FAILED_TO_PROCESS_MESSAGES",
        );
        expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "Missing timestamp",
          eventName: JSON.parse(missingTimestampSQSRecord.body).event_name,
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
      });
    });
  });

  describe("Given there is an error writing to Dynamo", () => {
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
        JSON.parse(passingSQSRecord.body).event_name,
      );
      expect(mockLogger.getLogMessages()[1].data.sessionId).toStrictEqual(
        JSON.parse(passingSQSRecord.body).user.session_id,
      );
      expect(mockLogger.getLogMessages()[2].logMessage.message).toStrictEqual(
        "PROCESSED_MESSAGES",
      );
      expect(mockLogger.getLogMessages()[2].data).toStrictEqual({
        processedMessages: [],
      });
      expect(result).toStrictEqual({
        batchItemFailures: [{ itemIdentifier: passingSQSRecord.messageId }],
      });
    });
  });

  describe("Given not all messages are processed successfully", () => {
    let event: SQSEvent;

    beforeEach(async () => {
      event = {
        Records: [passingSQSRecord, invalidBodySQSRecord],
      };
      await lambdaHandlerConstructor(dependencies, event, buildLambdaContext());
    });

    it("Logs the messageId of messages that failed to be processed", async () => {
      expect(mockLogger.getLogMessages().length).toEqual(4);
      expect(mockLogger.getLogMessages()[1].logMessage.message).toStrictEqual(
        "FAILED_TO_PROCESS_MESSAGES",
      );
      expect(mockLogger.getLogMessages()[1].data.errorMessage).toEqual(
        `Failed to process message - messageId: ${invalidBodySQSRecord.messageId}`,
      );
    });

    it("Makes a call to the database client", async () => {
      expect(mockDbClient).toHaveReceivedCommandTimes(PutItemCommand, 1);
      expect(mockDbClient).toHaveReceivedNthCommandWith(
        1,
        PutItemCommand,
        putItemInputForPassingSQSRecord,
      );
    });

    it("Logs successfully processed messages", async () => {
      expect(mockLogger.getLogMessages()[2].data.processedMessages).toEqual([
        {
          eventName: JSON.parse(passingSQSRecord.body).event_name,
          sessionId: JSON.parse(passingSQSRecord.body).user.session_id,
        },
      ]);
    });
  });

  describe("Happy path", () => {
    describe("Given there is one record in the event", () => {
      it("Logs the event_name and session_id", async () => {
        const event: SQSEvent = {
          Records: [passingSQSRecord],
        };

        await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(mockLogger.getLogMessages().length).toEqual(3);
        expect(mockLogger.getLogMessages()[1].data.processedMessages).toEqual([
          {
            eventName: JSON.parse(passingSQSRecord.body).event_name,
            sessionId: JSON.parse(passingSQSRecord.body).user.session_id,
          },
        ]);
      });
    });

    describe("Given there are multiple records in the event", () => {
      it("Logs the event_name and session_id for each message", async () => {
        const event: SQSEvent = {
          Records: [passingSQSRecord, passingSQSRecord],
        };

        await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        const eventName = JSON.parse(passingSQSRecord.body).event_name;
        const sessionId = JSON.parse(passingSQSRecord.body).user.session_id;
        expect(mockLogger.getLogMessages().length).toEqual(3);
        expect(mockLogger.getLogMessages()[1].data.processedMessages).toEqual([
          {
            eventName,
            sessionId,
          },
          {
            eventName,
            sessionId,
          },
        ]);
      });
    });
  });
});
