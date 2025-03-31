import { Context, SQSEvent } from "aws-lambda";
import {
  IssueBiometricCredentialDependencies,
  runtimeDependencies,
} from "./handlerDependencies";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { setupLogger } from "../common/logging/setupLogger";
import { emptyFailure, Result, successResult } from "../utils/result";
import { validateSessionId } from "../common/request/validateSessionId/validateSessionId";

export async function lambdaHandlerConstructor(
  _dependencies: IssueBiometricCredentialDependencies,
  event: SQSEvent,
  context: Context,
): Promise<void> {
  setupLogger(context);
  logger.info(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_STARTED);

  const validateSqsEventResult = validateSqsEvent(event);
  if (validateSqsEventResult.isError) {
    return;
  }

  logger.info(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED);
}

export const lambdaHandler = lambdaHandlerConstructor.bind(
  null,
  runtimeDependencies,
);

const validateSqsEvent = (
  event: SQSEvent,
): Result<{ sessionId: string }, void> => {
  if (event == null) {
    logger.error(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT, {
      errorMessage: "Event is either null or undefined.",
    });
    return emptyFailure();
  }

  if (event.Records == null) {
    logger.error(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT, {
      errorMessage: "Invalid event structure: Missing 'Records' array.",
    });
    return emptyFailure();
  }

  if (event.Records.length !== 1) {
    logger.error(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT, {
      errorMessage: `Expected exactly one record, got ${event.Records.length}.`,
    });
    return emptyFailure();
  }

  const record = event.Records[0];
  if (record.body == null) {
    logger.error(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT, {
      errorMessage: "Event body either null or undefined.",
    });
    return emptyFailure();
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(record.body);
  } catch {
    logger.error(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT, {
      errorMessage: `Failed to parse event body. Body: ${record.body}`,
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
