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
import { GetSessionIssueBiometricCredential } from "../common/session/getOperations/IssueBiometricCredential/GetSessionIssueBiometricCredential";
import {
  GetSessionError,
  GetSessionFailed,
} from "../common/session/SessionRegistry/types";
import { Result, emptyFailure, successResult } from "../utils/result";
import { GetSecrets } from "../common/config/secrets";
import { IEventService } from "../services/events/types";
import { RetainMessageOnQueue } from "./RetainMessageOnQueue";

export async function lambdaHandlerConstructor(
  dependencies: IssueBiometricCredentialDependencies,
  event: SQSEvent,
  context: Context,
): Promise<void> {
  setupLogger(context);
  logger.info(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_STARTED);

  const configResult = getIssueBiometricCredentialConfig(dependencies.env);
  if (configResult.isError) {
    logger.error(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_INVALID_CONFIG);
    throw new RetainMessageOnQueue("Invalid config");
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
  const eventService = dependencies.getEventService(config.TXMA_SQS);

  const getSessionResult = await sessionRegistry.getSession(
    sessionId,
    new GetSessionIssueBiometricCredential(),
  );
  if (getSessionResult.isError) {
    return handleGetSessionError({
      errorData: getSessionResult.value,
      eventService,
      issuer: config.ISSUER,
      sessionId,
    });
  }

  const viewerKeyResult = await getBiometricViewerAccessKey(
    config.BIOMETRIC_VIEWER_KEY_SECRET_PATH,
    Number(config.BIOMETRIC_VIEWER_ACCESS_KEY_SECRET_CACHE_DURATION_IN_SECONDS),
    dependencies.getSecrets,
  );
  if (viewerKeyResult.isError) {
    throw new RetainMessageOnQueue("Failed to retrieve biometric viewer key");
  }

  logger.info(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED);
}

export const lambdaHandler = lambdaHandlerConstructor.bind(
  null,
  runtimeDependencies,
);

async function getBiometricViewerAccessKey(
  path: string,
  cacheDurationInSeconds: number,
  getSecrets: GetSecrets,
): Promise<Result<string, void>> {
  const getViewerKeyResult = await getSecrets({
    secretNames: [path],
    cacheDurationInSeconds,
  });
  if (getViewerKeyResult.isError) {
    return emptyFailure();
  }

  const secretsByName = getViewerKeyResult.value;
  return successResult(secretsByName[path]);
}

const handleGetSessionError = async (options: HandleGetSessionErrorOptions) => {
  const { errorData, eventService, issuer, sessionId } = options;

  if (errorData.errorType === GetSessionError.INTERNAL_SERVER_ERROR) {
    return;
  }

  const eventName = "DCMAW_ASYNC_CRI_5XXERROR";
  const writeEventResult = await eventService.writeGenericEvent({
    componentId: issuer,
    eventName,
    getNowInMilliseconds: Date.now,
    govukSigninJourneyId: undefined,
    ipAddress: undefined,
    redirect_uri: undefined,
    sessionId,
    sub: undefined,
    suspected_fraud_signal: undefined,
    txmaAuditEncoded: undefined,
  });
  if (writeEventResult.isError) {
    logger.error(LogMessage.ERROR_WRITING_AUDIT_EVENT, {
      data: {
        auditEventName: eventName,
      },
    });
    return;
  }

  throw new RetainMessageOnQueue("Failed to retrieve session from database");
};

interface HandleGetSessionErrorOptions {
  errorData: GetSessionFailed;
  eventService: IEventService;
  issuer: string;
  sessionId: string;
}
