import { SQSEvent } from "aws-lambda";
import { emptyFailure, Result, successResult } from "../utils/result";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { validateSessionId } from "../common/request/validateSessionId/validateSessionId";

export const validateSqsEvent = (event: SQSEvent): Result<string, void> => {
  if (event.Records.length !== 1) {
    logger.error(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT, {
      errorMessage: `Expected exactly one record, got ${event.Records.length}.`,
    });
    return emptyFailure();
  }
  const record = event.Records[0];

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(record.body);
  } catch {
    logger.error(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT, {
      errorMessage: `Failed to parse event body. Body: ${record.body}`,
    });
    return emptyFailure();
  }

  if (!isParsedBody(parsedBody)) {
    logger.error(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT, {
      errorMessage: `Parsed body not in expected shape: ${JSON.stringify(parsedBody)}`,
    });
    return emptyFailure();
  }
  const { sessionId } = parsedBody;

  const validateSessionIdResult = validateSessionId(sessionId);
  if (validateSessionIdResult.isError) {
    logger.error(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT, {
      errorMessage: validateSessionIdResult.value.errorMessage,
    });
    return emptyFailure();
  }

  return successResult(sessionId);
};

const isParsedBody = (
  parsedBody: unknown,
): parsedBody is { sessionId: string } => {
  if (
    typeof parsedBody !== "object" ||
    parsedBody == null ||
    Array.isArray(parsedBody)
  ) {
    return false;
  }

  return "sessionId" in parsedBody && typeof parsedBody.sessionId === "string";
};
