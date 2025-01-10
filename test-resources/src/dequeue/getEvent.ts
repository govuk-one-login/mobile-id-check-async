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

  if (!txmaEvent.event_name) {
    return errorResult({
      errorMessage: "Missing event_name",
    });
  }

  if (!allowedTxmaEventNames.includes(txmaEvent.event_name)) {
    return errorResult({
      errorMessage: "event_name not allowed",
      eventName: txmaEvent.event_name,
    });
  }
  let session_id = txmaEvent.user?.session_id;
  if (!session_id) {
    if (!allowedTxmaEventNamesWithoutSessionId.includes(txmaEvent.event_name)) {
      return errorResult({
        errorMessage: "Missing session_id",
        eventName: txmaEvent.event_name,
      });
    } else {
      session_id = "UNKNOWN";
    }
  }

  if (!txmaEvent.timestamp) {
    return errorResult({
      errorMessage: "Missing timestamp",
      eventName: txmaEvent.event_name,
    });
  }

  return successResult(txmaEvent);
}

interface TxmaEvent {
  event_name: string;
  user: {
    session_id: string;
  };
  timestamp: number;
}

export const allowedTxmaEventNames = [
  "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
  "DCMAW_ASYNC_CRI_START",
];

const allowedTxmaEventNamesWithoutSessionId = [
  "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
];
