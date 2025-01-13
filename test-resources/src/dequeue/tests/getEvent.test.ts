import { PutItemCommand } from "@aws-sdk/client-dynamodb";
import { SQSEvent } from "aws-lambda";
import { buildLambdaContext } from "../../services/logging/tests/mockContext";
import { lambdaHandlerConstructor } from "../dequeueHandler";
import {
  invalidBodySQSRecord,
  eventNameMissingSQSRecord,
  eventNameNotAllowedSQSRecord,
  notAllowedEventName,
  missingSessionIdValidSQSRecord,
  putItemInputForPassingSQSRecordWithoutSessionId,
  missingSessionIdInvalidSQSRecord,
  missingTimestampSQSRecord,
} from "./testData";
import { getEvent } from "../getEvent";

describe("Get Events", () => {
  describe("Message validation", () => {
    describe("Given there is an error parsing the record body", () => {
      it("Logs an error message", async () => {
        const record = invalidBodySQSRecord;

        const result = getEvent(record);

        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage:
            "Failed to process message - messageId: 54D7CA2F-BE1D-4D55-8F1C-9B3B501C9685",
          body: "{",
        });
        // expect(result.value.)
        // expect(mockLogger.getLogMessages()[1].logMessage.messageCode).toEqual(
        //   "DEQUEUE_FAILED_TO_PROCESS_MESSAGES",
        // );
        // expect(mockLogger.getLogMessages()[1].data.errorMessage).toEqual(
        //   `Failed to process message - messageId: ${invalidBodySQSRecord.messageId}`,
        // );
        // expect(mockLogger.getLogMessages()[1].data.body).toEqual("{");
        // expect(result).toStrictEqual({
        //   batchItemFailures: [
        //     { itemIdentifier: invalidBodySQSRecord.messageId },
        //   ],
        // });
        // expect(mockLogger.getLogMessages()[2].data.processedMessages).toEqual(
        //   [],
        // );
      });
    });

    //   describe("Given event_name is missing", () => {
    //     it("Logs an error message", async () => {
    //       const event: SQSEvent = {
    //         const record = [eventNameMissingSQSRecord],
    //       };

    //       const result = await lambdaHandlerConstructor(
    //         dependencies,
    //         event,
    //         buildLambdaContext(),
    //       );

    //       expect(mockLogger.getLogMessages().length).toEqual(4);
    //       expect(mockLogger.getLogMessages()[1].logMessage.messageCode).toEqual(
    //         "DEQUEUE_FAILED_TO_PROCESS_MESSAGES",
    //       );
    //       expect(mockLogger.getLogMessages()[1].data.errorMessage).toEqual(
    //         "Missing event_name",
    //       );
    //       expect(mockLogger.getLogMessages()[2].logMessage.message).toStrictEqual(
    //         "PROCESSED_MESSAGES",
    //       );
    //       expect(mockLogger.getLogMessages()[2].data).toStrictEqual({
    //         processedMessages: [],
    //       });
    //       expect(result).toStrictEqual({
    //         batchItemFailures: [
    //           { itemIdentifier: eventNameMissingSQSRecord.messageId },
    //         ],
    //       });
    //     });
    //   });

    //   describe("Given the event_name is not allowed", () => {
    //     it("Logs an error message", async () => {
    //       const event: SQSEvent = {
    //         const record = [eventNameNotAllowedSQSRecord],
    //       };

    //       const result = await lambdaHandlerConstructor(
    //         dependencies,
    //         event,
    //         buildLambdaContext(),
    //       );

    //       expect(mockLogger.getLogMessages().length).toEqual(4);
    //       expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
    //         errorMessage: "event_name not allowed",
    //         eventName: notAllowedEventName,
    //       });
    //       expect(mockLogger.getLogMessages()[2].logMessage.message).toStrictEqual(
    //         "PROCESSED_MESSAGES",
    //       );
    //       expect(mockLogger.getLogMessages()[2].data).toStrictEqual({
    //         processedMessages: [],
    //       });
    //       expect(result).toStrictEqual({
    //         batchItemFailures: [
    //           { itemIdentifier: eventNameNotAllowedSQSRecord.messageId },
    //         ],
    //       });
    //     });
    //   });

    //   describe("Given session_id is missing", () => {
    //     describe("Given the registered event schema does not include a session_id", () => {
    //       it("Writes to Dynamo using UNKNOWN as the sessionId", async () => {
    //         const event: SQSEvent = {
    //           const record = [missingSessionIdValidSQSRecord],
    //         };

    //         const result = await lambdaHandlerConstructor(
    //           dependencies,
    //           event,
    //           buildLambdaContext(),
    //         );

    //         expect(mockLogger.getLogMessages().length).toEqual(3);
    //         expect(
    //           mockLogger.getLogMessages()[1].logMessage.message,
    //         ).toStrictEqual("PROCESSED_MESSAGES");
    //         expect(mockLogger.getLogMessages()[1].data.processedMessages).toEqual(
    //           [
    //             {
    //               eventName: JSON.parse(missingSessionIdValidSQSRecord.body)
    //                 .event_name,
    //               sessionId: "UNKNOWN",
    //             },
    //           ],
    //         );

    //         expect(mockDbClient).toHaveReceivedCommandWith(
    //           PutItemCommand,
    //           putItemInputForPassingSQSRecordWithoutSessionId,
    //         );
    //         expect(result).toStrictEqual({
    //           batchItemFailures: [],
    //         });
    //       });
    //     });

    //     describe("Given the registered event schema includes a session_id", () => {
    //       it("Logs an error message", async () => {
    //         const event: SQSEvent = {
    //           const record = [missingSessionIdInvalidSQSRecord],
    //         };

    //         const result = await lambdaHandlerConstructor(
    //           dependencies,
    //           event,
    //           buildLambdaContext(),
    //         );

    //         expect(mockLogger.getLogMessages().length).toEqual(4);
    //         expect(
    //           mockLogger.getLogMessages()[1].logMessage.message,
    //         ).toStrictEqual("FAILED_TO_PROCESS_MESSAGES");
    //         expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
    //           errorMessage: "Missing session_id",
    //           eventName: JSON.parse(missingSessionIdInvalidSQSRecord.body)
    //             .event_name,
    //         });
    //         expect(
    //           mockLogger.getLogMessages()[2].logMessage.message,
    //         ).toStrictEqual("PROCESSED_MESSAGES");
    //         expect(mockLogger.getLogMessages()[2].data).toStrictEqual({
    //           processedMessages: [],
    //         });
    //         expect(result).toStrictEqual({
    //           batchItemFailures: [
    //             { itemIdentifier: missingSessionIdInvalidSQSRecord.messageId },
    //           ],
    //         });
    //       });
    //     });
    //   });

    //   describe("Given timestamp is missing", () => {
    //     it("Logs an error message", async () => {
    //       const event: SQSEvent = {
    //         const record = [missingTimestampSQSRecord],
    //       };

    //       const result = await lambdaHandlerConstructor(
    //         dependencies,
    //         event,
    //         buildLambdaContext(),
    //       );

    //       expect(mockLogger.getLogMessages().length).toEqual(4);
    //       expect(mockLogger.getLogMessages()[1].logMessage.message).toStrictEqual(
    //         "FAILED_TO_PROCESS_MESSAGES",
    //       );
    //       expect(mockLogger.getLogMessages()[1].data).toStrictEqual({
    //         errorMessage: "Missing timestamp",
    //         eventName: JSON.parse(missingTimestampSQSRecord.body).event_name,
    //       });
    //       expect(mockLogger.getLogMessages()[2].logMessage.message).toStrictEqual(
    //         "PROCESSED_MESSAGES",
    //       );
    //       expect(mockLogger.getLogMessages()[2].logMessage.message).toStrictEqual(
    //         "PROCESSED_MESSAGES",
    //       );
    //       expect(mockLogger.getLogMessages()[2].data).toStrictEqual({
    //         processedMessages: [],
    //       });
    //       expect(result).toStrictEqual({
    //         batchItemFailures: [
    //           { itemIdentifier: missingTimestampSQSRecord.messageId },
    //         ],
    //       });
    //     });
    //   });
  });

  // describe("Happy path", () => {

  // })
});
