import { SQSRecord } from "aws-lambda";
import { logger } from "../../common/logging/logger";
import { LogMessage } from "../../common/logging/LogMessage";
import { emptyFailure, Result, successResult } from "../../common/utils/result";
import { IProcessedMessage } from "../dequeueCredentialResultHandler";

export function validateCredentialResult(
  record: SQSRecord,
): Result<IProcessedMessage, void> {
  const { body: recordBody } = record;
  let credentialResult;
  try {
    credentialResult = JSON.parse(recordBody);
  } catch {
    logger.error(LogMessage.DEQUEUE_CREDENTIAL_RESULT_INVALID_JSON, {
      recordBody,
    });
    return emptyFailure();
  }

  if (!credentialResult.subjectIdentifier) {
    logger.error(LogMessage.DEQUEUE_CREDENTIAL_RESULT_MISSING_SUB, {
      credentialResult,
    });
    return emptyFailure();
  }

  if (!credentialResult.timestamp) {
    logger.error(LogMessage.DEQUEUE_CREDENTIAL_RESULT_MISSING_TIMESTAMP, {
      credentialResult,
    });
    return emptyFailure();
  }

  return successResult(credentialResult);
}
