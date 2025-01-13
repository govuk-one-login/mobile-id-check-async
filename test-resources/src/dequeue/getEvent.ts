import { SQSRecord } from "aws-lambda";
import { errorResult, Result, successResult } from "../utils/result";

export function getEvent(record: SQSRecord): Result<TxmaEvent> {
  let txmaEvent: TxmaEvent;

  try {
    txmaEvent = JSON.parse(record.body);
  } catch {
    return errorResult({
      errorMessage: `Failed to process message - messageId: ${record.messageId}`,
      body: record.body,
    });
  }

  const eventName = txmaEvent.event_name;
  if (!eventName) {
    return errorResult({
      errorMessage: "Missing event_name",
    });
  }

  if (!allowedTxmaEventNames.includes(eventName)) {
    return errorResult({
      errorMessage: "event_name not allowed",
      eventName,
    });
  }

  const sessionId = txmaEvent.user?.session_id;
  if (!sessionId) {
    if (!allowedTxmaEventNamesWithoutSessionId.includes(eventName)) {
      return errorResult({
        errorMessage: "Missing session_id",
        eventName,
      });
    } else {
      txmaEvent.user = { session_id: "UNKNOWN" };
    }
  }

  if (!txmaEvent.timestamp) {
    return errorResult({
      errorMessage: "Missing timestamp",
      eventName,
    });
  }

  return successResult(txmaEvent);
}

export interface TxmaEvent {
  event_name: string;
  user: {
    session_id: string;
  };
  timestamp: string;
}

export const allowedTxmaEventNames = [
  "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
  "DCMAW_ASYNC_CRI_START",
];

const allowedTxmaEventNamesWithoutSessionId = [
  "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
];
