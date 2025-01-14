import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { SQSBatchResponse, SQSEvent, SQSRecord } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import "aws-sdk-client-mock-jest";
import { Logger } from "../../services/logging/logger";
import { buildLambdaContext } from "../../services/logging/tests/mockContext";
import { MockLoggingAdapter } from "../../services/logging/tests/mockLogger";
import { errorResult, Result, successResult } from "../../utils/result";
import {
  IDequeueDependencies,
  lambdaHandlerConstructor,
} from "../dequeueHandler";
import { TxmaEvent } from "../getEvent";
import { MessageName, registeredLogs } from "../registeredLogs";
import {
  eventNameMissingSQSRecord,
  invalidBodySQSRecord,
  passingSQSRecord,
  putItemInputForPassingSQSRecord,
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
    mockDbClient.on(PutItemCommand).rejects({});
    dependencies = {
      env,
      logger: () => new Logger(mockLogger, registeredLogs),
      getEvent: mockGetEvent,
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

  describe("Given validation fails when retrieving an event", () => {
    let event: SQSEvent;
    let result: SQSBatchResponse;

    beforeEach(async () => {
      event = {
        Records: [eventNameMissingSQSRecord],
      };
      result = await lambdaHandlerConstructor(
        dependencies,
        event,
        buildLambdaContext(),
      );
    });

    it("Returns an error message", () => {
      expect(mockLogger.getLogMessages()[1]).toEqual({
        logMessage: expect.objectContaining({
          messageCode: "DEQUEUE_FAILED_TO_PROCESS_MESSAGES",
          message: "FAILED_TO_PROCESS_MESSAGES",
        }),
        data: {
          errorMessage: "Mock validation error",
          body: "Invalid body",
        },
      });
    });

    it("Returns no no batchItemFailures to be reprocessed", () => {
      expect(result).toStrictEqual({ batchItemFailures: [] });
    });
  });

  describe("Given there is an error writing to Dynamo", () => {
    it("Logs an error message and returns batchItemFailures to be reprocessed", async () => {
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

  describe("Given not all messages are processed successfully due to a validation failure", () => {
    let event: SQSEvent;
    let result: SQSBatchResponse;

    beforeEach(async () => {
      mockDbClient.on(PutItemCommand).resolves({});
      event = {
        Records: [passingSQSRecord, invalidBodySQSRecord],
      };
      result = await lambdaHandlerConstructor(
        dependencies,
        event,
        buildLambdaContext(),
      );
    });

    it("Logs the messageId of messages that failed to be processed", async () => {
      expect(mockLogger.getLogMessages().length).toEqual(4);
      expect(mockLogger.getLogMessages()[1].logMessage.message).toStrictEqual(
        "FAILED_TO_PROCESS_MESSAGES",
      );
      expect(mockLogger.getLogMessages()[1].data.errorMessage).toEqual(
        `Mock validation error`,
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
    it("Returns no batchItemFailures to be reprocessed", () => {
      expect(result).toEqual({ batchItemFailures: [] });
    });
  });

  describe("Happy path", () => {
    describe("Given there is one record in the event", () => {
      it("Logs the event_name and session_id", async () => {
        mockDbClient.on(PutItemCommand).resolves({});
        const event: SQSEvent = {
          Records: [passingSQSRecord],
        };

        const result = await lambdaHandlerConstructor(
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
        expect(result).toEqual({ batchItemFailures: [] });
      });
    });

    describe("Given there are multiple records in the event", () => {
      it("Logs the event_name and session_id for each message", async () => {
        mockDbClient.on(PutItemCommand).resolves({});
        const event: SQSEvent = {
          Records: [passingSQSRecord, passingSQSRecord],
        };

        const result = await lambdaHandlerConstructor(
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
        expect(result).toEqual({ batchItemFailures: [] });
      });
    });
  });
});

function mockGetEvent(record: SQSRecord): Result<TxmaEvent> {
  if (record.messageId === passingSQSRecord.messageId) {
    return successResult({
      event_name: "DCMAW_ASYNC_CRI_START",
      user: {
        session_id: "49E7D76E-D5FE-4355-B8B4-E90ACA0887C2",
      },
      timestamp: "mockTimestamp",
    });
  }

  return errorResult({
    errorMessage: "Mock validation error",
    body: "Invalid body",
  });
}
