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

import { IssueBiometricCredentialMessage } from "../adapters/aws/sqs/types";
import { GetSessionBiometricTokenIssued } from "../common/session/getOperations/TxmaEvent/GetSessionBiometricTokenIssued";
import {
  isRetryableError,
  getLastError,
} from "./getBiometricSession/getBiometricSession";

import { IEventService } from "../services/events/types";
import { RetainMessageOnQueue } from "./RetainMessageOnQueue";
import { SessionState } from "../common/session/session";


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


  const getSessionResult = await sessionRegistry.getSession(
    sessionId,
    new GetSessionBiometricTokenIssued(),
  );

  if (getSessionResult.isError) {
    logger.warn(LogMessage.SESSION_NOT_FOUND, {
      data: { sessionId },
    });
  }

  const sessionAttributes = getSessionResult.isError
    ? undefined
    : getSessionResult.value;
=======
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
  const sessionAttributes = getSessionResult.value;

  if (sessionAttributes.sessionState === SessionState.RESULT_SENT) {
    logger.info(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED);
    return;
  }


  const viewerKeyResult = await getBiometricViewerAccessKey(
    config.BIOMETRIC_VIEWER_KEY_SECRET_PATH,
    Number(config.BIOMETRIC_VIEWER_ACCESS_KEY_SECRET_CACHE_DURATION_IN_SECONDS),
    dependencies.getSecrets,
  );
  if (viewerKeyResult.isError) {
    throw new RetainMessageOnQueue("Failed to retrieve biometric viewer key");
  }
  const submitterKey = viewerKeyResult.value;

  const sessionResult = await dependencies.getBiometricSession(
    config.READID_BASE_URL,
    sessionId,
    submitterKey,
  );

  if (sessionResult.isError) {
    const eventService = dependencies.getEventService(config.TXMA_SQS);

    // Check if the error was retryable based on HTTP status code
    if (isRetryableError()) {
      const error = getLastError();
      logger.error(LogMessage.BIOMETRIC_SESSION_RETRYABLE_ERROR);
      throw new RetainMessageOnQueue(
        `Retryable error (${error?.statusCode}) retrieving biometric session`,
      );
    }

    // Non-retryable error - send error to IPV Core
    logger.error(LogMessage.BIOMETRIC_SESSION_NON_RETRYABLE_ERROR, {
      data: {
        sessionId,
        error: getLastError(),
      },
    });

    if (
      sessionAttributes?.subjectIdentifier &&
      sessionAttributes?.clientState
    ) {
      const ipvCoreOutboundMessage: IssueBiometricCredentialMessage = {
        sub: sessionAttributes.subjectIdentifier,
        state: sessionAttributes.clientState,
        error: "server_error",
        error_description: "Failed to retrieve biometric session from ReadID",
      };

      const sendMessageToIPVCoreOutboundQueueResult =
        await dependencies.sendMessageToSqs(
          config.IPVCORE_OUTBOUND_SQS,
          ipvCoreOutboundMessage,
        );

      if (sendMessageToIPVCoreOutboundQueueResult.isError) {
        logger.error(LogMessage.BIOMETRIC_SESSION_IPV_CORE_MESSAGE_ERROR);
      }
    }

    const writeEventResult = await eventService.writeGenericEvent({
      eventName: "DCMAW_ASYNC_CRI_5XXERROR",
      sub: sessionAttributes?.subjectIdentifier,
      sessionId,
      govukSigninJourneyId: sessionAttributes?.govukSigninJourneyId,
      getNowInMilliseconds: Date.now,
      componentId: config.ISSUER,
      ipAddress: undefined,
      txmaAuditEncoded: undefined,
      redirect_uri: sessionAttributes?.redirectUri,
      suspected_fraud_signal: undefined,
    });

    if (writeEventResult.isError) {
      logger.error(LogMessage.BIOMETRIC_SESSION_TXMA_EVENT_ERROR);
    }

    return;
  }

  const session = sessionResult.value;

  // Check if the session is ready
  if (session.finish !== "DONE") {
    logger.info(LogMessage.BIOMETRIC_SESSION_NOT_READY, {
      data: { finish: session.finish },
    });
    throw new RetainMessageOnQueue(
      `Biometric session not ready: ${session.finish}`,
    );
  }

  // Session is ready, continue processing
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

const handleGetSessionError = async (
  options: HandleGetSessionErrorParameters,
): Promise<void> => {
  const { errorData, eventService, issuer, sessionId } = options;

  if (errorData.errorType === GetSessionError.INTERNAL_SERVER_ERROR) {
    throw new RetainMessageOnQueue(
      "Unexpected failure retrieving session from database",
    );
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
  }
};

interface HandleGetSessionErrorParameters {
  errorData: GetSessionFailed;
  eventService: IEventService;
  issuer: string;
  sessionId: string;
}
