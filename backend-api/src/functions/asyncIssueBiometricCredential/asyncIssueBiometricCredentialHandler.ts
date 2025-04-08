import { Context, SQSEvent } from "aws-lambda";
import {
  IssueBiometricCredentialDependencies,
  runtimeDependencies,
} from "./handlerDependencies";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { setupLogger } from "../common/logging/setupLogger";
import { validateVendorProcessingQueueSqsEvent } from "./validateSqsEvent";
import { getIssueBiometricCredentialConfig } from "./issueBiometricCredentialConfig";
import { GetSessionError } from "../common/session/SessionRegistry";
import { GetSessionIssueBiometricCredential } from "../common/session/getOperations/GetSessionIssueBiometricCredential/GetSessionIssueBiometricCredential";

export async function lambdaHandlerConstructor(
  dependencies: IssueBiometricCredentialDependencies,
  event: SQSEvent,
  context: Context,
): Promise<void> {
  setupLogger(context);
  logger.info(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_STARTED);

  const configResult = getIssueBiometricCredentialConfig(dependencies.env);
  if (configResult.isError) {
    return;
  }
  const config = configResult.value;

  const validateSqsEventResult = validateVendorProcessingQueueSqsEvent(event);
  if (validateSqsEventResult.isError) {
    return;
  }
  const sessionId = validateSqsEventResult.value;

  logger.appendKeys({ sessionId });

  const sessionRegistry = dependencies.getSessionRegistry(
    config.SESSION_TABLE_NAME,
  );
  const getSessionResult = await sessionRegistry.getSession(
    sessionId,
    new GetSessionIssueBiometricCredential(),
  );
  if (getSessionResult.isError) {
    const errorData = getSessionResult.value;
    if (errorData.errorType === GetSessionError.INTERNAL_SERVER_ERROR) {
      return;
    }
  }

  logger.info(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED);
}

export const lambdaHandler = lambdaHandlerConstructor.bind(
  null,
  runtimeDependencies,
);
