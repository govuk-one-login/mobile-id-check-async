import { getEvent } from "../getEvent";
import {
  eventNameMissingSQSRecord,
  eventNameNotAllowedSQSRecord,
  invalidBodySQSRecord,
  missingSessionIdInvalidSQSRecord,
  missingSessionIdValidSQSRecord,
  missingTimestampSQSRecord,
  passingSQSRecord,
} from "./testData";

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
      });
    });

    describe("Given event_name is missing", () => {
      it("Logs an error message", async () => {
        const record = eventNameMissingSQSRecord;

        const result = getEvent(record);
        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Missing event_name",
        });
      });
    });

    describe("Given the event_name is not allowed", () => {
      it("Logs an error message", async () => {
        const record = eventNameNotAllowedSQSRecord;

        const result = getEvent(record);
        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "event_name not allowed",
          eventName: "INVALID_EVENT_NAME",
        });
      });
    });

    describe("Given session_id is missing", () => {
      describe("Given the registered event schema does not include a session_id", () => {
        it("Writes to Dynamo using UNKNOWN as the sessionId", async () => {
          const record = missingSessionIdValidSQSRecord;

          const result = getEvent(record);
          expect(result.isError).toBe(false);
          expect(result.value).toStrictEqual({
            event_name: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
            user: {
              session_id: "UNKNOWN",
            },
            timestamp: "mockTimestamp",
          });
        });
      });
    });

    describe("Given the registered event schema includes a session_id", () => {
      it("Logs an error message", async () => {
        const record = missingSessionIdInvalidSQSRecord;

        const result = getEvent(record);
        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Missing session_id",
          eventName: "DCMAW_ASYNC_CRI_START",
        });
      });
    });

    describe("Given timestamp is missing", () => {
      it("Logs an error message", async () => {
        const record = missingTimestampSQSRecord;

        const result = getEvent(record);
        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Missing timestamp",
          eventName: "DCMAW_ASYNC_CRI_START",
        });
      });
    });
  });

  describe("Happy path", () => {
    describe("Given the event passes validation", () => {
      it("Returns the event", () => {
        const record = passingSQSRecord;

        const result = getEvent(record);
        expect(result.isError).toBe(false);
        expect(result.value).toStrictEqual({
          event_name: "DCMAW_ASYNC_CRI_START",
          user: {
            session_id: "49E7D76E-D5FE-4355-B8B4-E90ACA0887C2",
          },
          timestamp: "mockTimestamp",
        });
      });
    });
  });
});
