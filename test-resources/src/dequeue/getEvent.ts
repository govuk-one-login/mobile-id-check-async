import { SQSRecord } from "aws-lambda";
import { errorResult, Result, successResult } from "../utils/result";

export function getEvent(record: SQSRecord): Result<TxmaEvent> {
  let txmaEvent: TxmaEvent;

  try {
    txmaEvent = JSON.parse(record.body);
  } catch {
    return errorResult({
      errorMessage: `Failed to process message - messageId: ${record.messageId}`,
    });
  }

  if (!txmaEvent.event_name) {
    return errorResult({
      errorMessage: `Missing event_name - messageId: ${record.messageId}`,
    });
  }

  if (!allowedTxmaEventNames.includes(txmaEvent.event_name)) {
    return errorResult({
      errorMessage: `event_name not valid - messageId: ${record.messageId}`,
    });
  }

  if (!txmaEvent.user) {
    return errorResult({
      errorMessage: `Missing user - messageId: ${record.messageId}`,
    });
  }

  const { session_id } = txmaEvent.user;
  if (!session_id) {
    return errorResult({
      errorMessage: `Missing session_id - messageId: ${record.messageId}`,
    });
  }

  if (!isValidUUID(session_id)) {
    return errorResult({
      errorMessage: `session_id not valid - messageId: ${record.messageId}`,
    });
  }

  if (!txmaEvent.timestamp) {
    return errorResult({
      errorMessage: `Missing timestamp - messageId: ${record.messageId}`,
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

const isValidUUID = (input: string): boolean => {
  const regexUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isValidUUID = regexUUID.test(input);
  return isValidUUID;
};

export const allowedTxmaEventNames = [
  "DCMAW_ABORT_APP",
  "DCMAW_ABORT_WEB",
  "DCMAW_CRI_4XXERROR",
  "DCMAW_CRI_5XXERROR",
  "DCMAW_REDIRECT_SUCCESS",
  "DCMAW_REDIRECT_ABORT",
  "DCMAW_MISSING_CONTEXT_AFTER_ABORT",
  "DCMAW_MISSING_CONTEXT_AFTER_COMPLETION",
  "DCMAW_PASSPORT_SELECTED",
  "DCMAW_BRP_SELECTED",
  "DCMAW_DRIVING_LICENCE_SELECTED",
  "DCMAW_CRI_END",
  "DCMAW_CRI_ABORT",
  "DCMAW_APP_HANDOFF_START",
  "DCMAW_HYBRID_BILLING_STARTED",
  "DCMAW_IPROOV_BILLING_STARTED",
  "DCMAW_READID_NFC_BILLING_STARTED",
  "DCMAW_CRI_START",
  "DCMAW_APP_END",
  "AUTH_SESSION_TOO_OLD",
  "BIOMETRIC_SESSION_OLDER_THAN_AUTH_SESSION",
  "BIOMETRIC_SESSION_OPAQUEID_MISMATCH",
];
