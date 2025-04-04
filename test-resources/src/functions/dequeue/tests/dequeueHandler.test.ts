import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { expect } from "@jest/globals";
import { Context, SQSBatchResponse, SQSEvent, SQSRecord } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import "aws-sdk-client-mock-jest";
import { errorResult, Result, successResult } from "../../common/utils/result";
import "../../testUtils/matchers";
import { buildLambdaContext } from "../../testUtils/mockContext";
import {
  IDequeueDependencies,
  lambdaHandlerConstructor,
} from "../dequeueHandler";
import { TxmaEvent } from "../getEvent";
import {
  eventNameMissingSQSRecord,
  invalidBodySQSRecord,
  NOW_IN_MILLISECONDS,
  passingSQSRecordKnownSessionId,
  passingSQSRecordUnknownSessionId,
  putItemInputForPassingSQSRecord,
  putItemInputForPassingSQSRecordUnknownSessionId,
} from "./testData";

import { logger } from "../../common/logging/logger";

const env = {
  EVENTS_TABLE_NAME: "mock-table-name",
  TXMA_EVENT_TTL_DURATION_IN_SECONDS: "3600",
};

describe("Dequeue TxMA events", () => {
  let dependencies: IDequeueDependencies;
  let context: Context;
  const mockDbClient = mockClient(DynamoDBClient);
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);
    mockDbClient.on(PutItemCommand).rejects({});
    dependencies = {
      env,
      getEvent: mockGetEvent,
    };
    context = buildLambdaContext();
    consoleInfoSpy = jest.spyOn(console, "info");
    consoleErrorSpy = jest.spyOn(console, "error");
  });

  afterEach(() => {
    jest.useRealTimers();
    mockDbClient.reset();
  });

  describe("On every invocation", () => {
    let event: SQSEvent;

    beforeEach(async () => {
      event = {
        Records: [passingSQSRecordKnownSessionId],
      };
      await lambdaHandlerConstructor(dependencies, event, context);
    });
    it("Adds context and version to log attributes and logs STARTED message", () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "TEST_RESOURCES_DEQUEUE_EVENTS_STARTED",
        functionVersion: "1",
        function_arn: "arn:12345", // example field to verify that context has been added
      });
    });
    it("Clears pre-existing log attributes", async () => {
      logger.appendKeys({ testKey: "testValue" });
      await lambdaHandlerConstructor(dependencies, event, context);
      expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
        testKey: "testValue",
      });
    });
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

        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "TEST_RESOURCES_DEQUEUE_EVENTS_INVALID_CONFIG",
        });
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
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

      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "TEST_RESOURCES_DEQUEUE_EVENTS_PROCESSED_MESSAGES",
      });
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        processedMessages: [],
      });
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "TEST_RESOURCES_DEQUEUE_EVENTS_COMPLETED",
      });
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
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        messageCode: "TEST_RESOURCES_DEQUEUE_EVENTS_FAILURE_PROCESSING_MESSAGE",
      });
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        errorMessage: "Mock validation error",
      });
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        body: "Invalid body",
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
        Records: [passingSQSRecordKnownSessionId],
      };

      const result = await lambdaHandlerConstructor(
        dependencies,
        event,
        buildLambdaContext(),
      );

      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        messageCode:
          "TEST_RESOURCES_DEQUEUE_EVENTS_FAILURE_WRITING_TO_DATABASE",
      });
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        eventName: JSON.parse(passingSQSRecordKnownSessionId.body).event_name,
      });
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        sessionId: JSON.parse(passingSQSRecordKnownSessionId.body).user
          .session_id,
      });
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "TEST_RESOURCES_DEQUEUE_EVENTS_PROCESSED_MESSAGES",
      });
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        processedMessages: [],
      });
      expect(result).toStrictEqual({
        batchItemFailures: [
          { itemIdentifier: passingSQSRecordKnownSessionId.messageId },
        ],
      });
    });
  });

  describe("Given not all messages are processed successfully due to a validation failure", () => {
    let event: SQSEvent;
    let result: SQSBatchResponse;

    beforeEach(async () => {
      mockDbClient.on(PutItemCommand).resolves({});
      event = {
        Records: [
          passingSQSRecordKnownSessionId,
          invalidBodySQSRecord,
          passingSQSRecordUnknownSessionId,
        ],
      };
      result = await lambdaHandlerConstructor(
        dependencies,
        event,
        buildLambdaContext(),
      );
    });

    it("Logs the messageId of messages that failed to be processed", async () => {
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        messageCode: "TEST_RESOURCES_DEQUEUE_EVENTS_FAILURE_PROCESSING_MESSAGE",
      });
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        errorMessage: `Mock validation error`,
      });
    });

    it("Makes a call to the database client", async () => {
      expect(mockDbClient).toHaveReceivedCommandTimes(PutItemCommand, 2);
      expect(mockDbClient).toHaveReceivedNthCommandWith(
        1,
        PutItemCommand,
        putItemInputForPassingSQSRecord,
      );
      expect(mockDbClient).toHaveReceivedNthCommandWith(
        2,
        PutItemCommand,
        putItemInputForPassingSQSRecordUnknownSessionId,
      );
    });

    it("Logs successfully processed messages", async () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        processedMessages: [
          {
            eventName: JSON.parse(passingSQSRecordKnownSessionId.body)
              .event_name,
            sessionId: JSON.parse(passingSQSRecordKnownSessionId.body).user
              .session_id,
          },
          {
            eventName: JSON.parse(passingSQSRecordUnknownSessionId.body)
              .event_name,
            sessionId: JSON.parse(passingSQSRecordUnknownSessionId.body).user
              .session_id,
          },
        ],
      });
      // expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
      //   eventName: JSON.parse(passingSQSRecordKnownSessionId.body).event_name
      // })
      // expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
      //   sessionId: JSON.parse(passingSQSRecordKnownSessionId.body).user
      //     .session_id,
      // })
      // expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
      //   eventName: JSON.parse(passingSQSRecordUnknownSessionId.body)
      //     .event_name,
      // })
      // expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
      //   sessionId: JSON.parse(passingSQSRecordUnknownSessionId.body).user
      //     .session_id,
      // });
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
          Records: [passingSQSRecordKnownSessionId],
        };

        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
          processedMessages: [
            {
              eventName: JSON.parse(passingSQSRecordKnownSessionId.body)
                .event_name,
              sessionId: JSON.parse(passingSQSRecordKnownSessionId.body).user
                .session_id,
            },
          ],
        });
        expect(result).toEqual({ batchItemFailures: [] });
      });
    });

    describe("Given there are multiple records in the event", () => {
      it("Logs the event_name and session_id for each message", async () => {
        mockDbClient.on(PutItemCommand).resolves({});
        const event: SQSEvent = {
          Records: [
            passingSQSRecordKnownSessionId,
            passingSQSRecordUnknownSessionId,
          ],
        };

        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );

        const eventName = JSON.parse(
          passingSQSRecordKnownSessionId.body,
        ).event_name;
        const sessionId = JSON.parse(passingSQSRecordKnownSessionId.body).user
          .session_id;
        const eventNameSessionIdUnknown = JSON.parse(
          passingSQSRecordUnknownSessionId.body,
        ).event_name;
        const sessionIdUnknown = JSON.parse(
          passingSQSRecordUnknownSessionId.body,
        ).user.session_id;
        expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
          processedMessages: [
            {
              eventName,
              sessionId,
            },
            {
              eventName: eventNameSessionIdUnknown,
              sessionId: sessionIdUnknown,
            },
          ],
        });
        expect(result).toEqual({ batchItemFailures: [] });
      });
    });
  });
});

function mockGetEvent(record: SQSRecord): Result<TxmaEvent> {
  if (record.messageId === passingSQSRecordKnownSessionId.messageId) {
    return successResult({
      event_name: "DCMAW_ASYNC_CRI_START",
      user: {
        session_id: "49E7D76E-D5FE-4355-B8B4-E90ACA0887C2",
      },
      timestamp: "mockTimestamp",
    });
  } else if (record.messageId === passingSQSRecordUnknownSessionId.messageId) {
    return successResult({
      event_name: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
      user: {
        session_id: "UNKNOWN",
      },
      timestamp: "mockTimestamp",
    });
  }

  return errorResult({
    errorMessage: "Mock validation error",
    body: "Invalid body",
  });
}
