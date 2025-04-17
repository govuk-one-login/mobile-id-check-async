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
import {
  GetSessionError,
  GetSessionFailed,
} from "../common/session/SessionRegistry/types";
import { Result, emptyFailure, successResult } from "../utils/result";
import { GetSecrets } from "../common/config/secrets";

import { IssueBiometricCredentialMessage } from "../adapters/aws/sqs/types";
import { GetSessionBiometricTokenIssued } from "../common/session/getOperations/TxmaEvent/GetSessionBiometricTokenIssued";

import { IEventService } from "../services/events/types";
import { RetainMessageOnQueue } from "./RetainMessageOnQueue";
import { SessionState } from "../common/session/session";
import { BiometricSessionError } from "./getBiometricSession/getBiometricSession";

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

  const sessionRegistry = dependencies.getSessionRegistry(
    config.SESSION_TABLE_NAME,
  );

  const eventService = dependencies.getEventService(config.TXMA_SQS);

  const getSessionResult = await sessionRegistry.getSession(
    sessionId,
    new GetSessionBiometricTokenIssued(),
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
  const viewerKey = viewerKeyResult.value;

  const biometricSessionResult = await dependencies.getBiometricSession(
    config.READID_BASE_URL,
    sessionId,
    viewerKey,
  );

  if (biometricSessionResult.isError) {
    const eventService = dependencies.getEventService(config.TXMA_SQS);
    const error: BiometricSessionError = biometricSessionResult.value;

    // Check if the error was retryable based on error info
    if (error.isRetryable) {
      logger.error(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_RETRYABLE_ERROR);
      throw new RetainMessageOnQueue(
        `Retryable error (status code: ${error.statusCode || "N/A"}) retrieving biometric session`,
      );
    }

    // Non-retryable error - send error to IPV Core
    logger.error(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_NON_RETRYABLE_ERROR, {
      data: {
        sessionId,
        error,
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
        logger.error(
          LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_IPV_CORE_MESSAGE_ERROR,
        );
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
      logger.error(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_TXMA_EVENT_ERROR);
    }

    return;
  }

  const session = biometricSessionResult.value;

  if (session.finish !== "DONE") {
    logger.info(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_NOT_READY, {
      data: { finish: session.finish },
    });
    logger.info(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED);
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
