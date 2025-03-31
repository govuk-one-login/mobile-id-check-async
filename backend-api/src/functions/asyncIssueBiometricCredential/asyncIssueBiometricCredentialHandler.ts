import { Context, SQSEvent } from "aws-lambda";
import {
  IssueBiometricCredentialDependencies,
  runtimeDependencies,
} from "./handlerDependencies";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { setupLogger } from "../common/logging/setupLogger";
import { emptySuccess, errorResult, Result } from "../utils/result";
import { validateSessionId } from "../common/request/validateSessionId/validateSessionId";

export async function lambdaHandlerConstructor(
  _dependencies: IssueBiometricCredentialDependencies,
  event: SQSEvent,
  context: Context,
): Promise<void> {
  setupLogger(context);
  logger.info(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_STARTED);

  validateSqsEvent(event);

  logger.info(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED);
}

export const lambdaHandler = lambdaHandlerConstructor.bind(
  null,
  runtimeDependencies,
);

function validateSqsEvent(event: SQSEvent): Result<void> {
  if (event == null) {
    const errorMessage = "Event is either null or undefined.";
    logger.error(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT, {
      errorMessage,
    });
    return errorResult({
      errorMessage,
    });
  }

  if (event.Records == null) {
    const errorMessage = "Invalid event structure: Missing 'Records' array.";
    logger.error(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT, {
      errorMessage,
    });
    return errorResult({
      errorMessage,
    });
  }

  if (event.Records.length !== 1) {
    const errorMessage = `Expected exactly one record, got ${event.Records.length}.`;
    logger.error(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT, {
      errorMessage,
    });
    return errorResult({
      errorMessage,
    });
  }

  const record = event.Records[0];
  if (record.body == null) {
    const errorMessage = "Event body either null or undefined.";
    logger.error(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT, {
      errorMessage,
    });
    return errorResult({
      errorMessage,
    });
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(record.body);
  } catch {
    const errorMessage = `Failed to parse event body. Body: ${record.body}`;
    logger.error(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT, {
      errorMessage,
    });
    return errorResult({
      errorMessage,
    });
  }

  const { sessionId } = parsedBody;
  const validateSessionIdResult = validateSessionId(sessionId);
  if (validateSessionIdResult.isError) {
    logger.error(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT, {
      errorMessage: validateSessionIdResult.value.errorMessage,
    });
    return validateSessionIdResult;
  }

  return emptySuccess();
}
