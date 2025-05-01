import { Context, SQSEvent } from "aws-lambda";
import {
  IssueBiometricCredentialDependencies,
  runtimeDependencies,
} from "./handlerDependencies";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { setupLogger } from "../common/logging/setupLogger";
import { validateVendorProcessingQueueSqsEvent } from "./validateSqsEvent";
import {
  getIssueBiometricCredentialConfig,
  IssueBiometricCredentialConfig,
} from "./issueBiometricCredentialConfig";
import {
  GetSessionError,
  GetSessionFailed,
} from "../common/session/SessionRegistry/types";
import { Result, emptyFailure, successResult } from "../utils/result";
import { GetSecrets } from "../common/config/secrets";

import { OutboundQueueErrorMessage } from "../adapters/aws/sqs/types";

import { GenericEventNames, IEventService } from "../services/events/types";
import { RetainMessageOnQueue } from "./RetainMessageOnQueue";
import {
  BiometricSessionFinishedAttributes,
  SessionAttributes,
  SessionState,
} from "../common/session/session";
import { GetBiometricSessionError } from "./getBiometricSession/getBiometricSession";
import { GetSessionIssueBiometricCredential } from "../common/session/getOperations/IssueBiometricCredential/GetSessionIssueBiometricCredential";
import {
  GetCredentialError,
  GetCredentialErrorCode,
  GetCredentialOptions,
  FraudCheckData,
} from "./mockGetCredentialFromBiometricSession/types";
import { CredentialJwt } from "../adapters/aws/kms/types";
import { randomUUID } from "crypto";

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
  const errorTxmaEventName = "DCMAW_ASYNC_CRI_ERROR";

  const getSessionResult = await sessionRegistry.getSession(
    sessionId,
    new GetSessionIssueBiometricCredential(),
  );

  if (getSessionResult.isError) {
    return handleGetSessionError({
      errorData: getSessionResult.value,
      eventName: errorTxmaEventName,
      eventService,
      issuer: config.ISSUER,
      sessionId,
    });
  }

  if (getSessionResult.value.sessionState === SessionState.RESULT_SENT) {
    logger.info(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED);
    return;
  }

  const sessionAttributes =
    getSessionResult.value as BiometricSessionFinishedAttributes;

  const viewerKeyResult = await getBiometricViewerAccessKey(
    config.BIOMETRIC_VIEWER_KEY_SECRET_PATH,
    Number(config.BIOMETRIC_VIEWER_ACCESS_KEY_SECRET_CACHE_DURATION_IN_SECONDS),
    dependencies.getSecrets,
  );
  if (viewerKeyResult.isError) {
    throw new RetainMessageOnQueue("Failed to retrieve biometric viewer key");
  }

  const viewerKey = viewerKeyResult.value;
  const { biometricSessionId } = sessionAttributes;
  logger.appendKeys({ biometricSessionId });

  const biometricSessionResult = await dependencies.getBiometricSession(
    config.READID_BASE_URL,
    biometricSessionId,
    viewerKey,
  );

  if (biometricSessionResult.isError) {
    const error: GetBiometricSessionError = biometricSessionResult.value;

    // Check if the error was retryable based on error info
    if (error.isRetryable) {
      throw new RetainMessageOnQueue(
        `Retryable error retrieving biometric session`,
      );
    }

    const handleSendErrorMessageToOutboundQueueResponse =
      await handleSendErrorMessageToOutboundQueue(
        dependencies,
        sessionAttributes,
        config,
        { error: "server_error", error_description: "Internal server error" },
      );
    if (handleSendErrorMessageToOutboundQueueResponse.isError) {
      logger.error(
        LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_IPV_CORE_MESSAGE_ERROR,
      );
    }

    const writeEventResult = await eventService.writeGenericEvent({
      eventName: errorTxmaEventName,
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
      logger.error(LogMessage.ERROR_WRITING_AUDIT_EVENT, {
        data: {
          auditEventName: errorTxmaEventName,
        },
      });
    }

    return;
  }

  const biometricSession = biometricSessionResult.value;

  if (biometricSession.finish !== "DONE") {
    logger.info(
      LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_BIOMETRIC_SESSION_NOT_READY,
      {
        data: { finish: biometricSession.finish },
      },
    );
    logger.info(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED);
    throw new RetainMessageOnQueue(
      `Biometric session not ready: ${biometricSession.finish}`,
    );
  }

  const fraudCheckData: FraudCheckData = {
    userSessionCreatedAt: sessionAttributes.createdAt,
    opaqueId: sessionAttributes.opaqueId,
  };
  const getCredentialFromBiometricSessionOptions: GetCredentialOptions = {
    enableBiometricResidenceCard:
      config.ENABLE_BIOMETRIC_RESIDENCE_CARD === "true",
    enableBiometricResidencePermit:
      config.ENABLE_BIOMETRIC_RESIDENCE_PERMIT === "true",
    enableDrivingLicence: config.ENABLE_DRIVING_LICENCE === "true",
    enableNfcPassport: config.ENABLE_NFC_PASSPORT === "true",
    enableUtopiaTestDocument: config.ENABLE_UTOPIA_TEST_DOCUMENT === "true",
  };

  const getCredentialFromBiometricSessionResult =
    dependencies.getCredentialFromBiometricSession(
      biometricSession,
      fraudCheckData,
      getCredentialFromBiometricSessionOptions,
    );

  if (getCredentialFromBiometricSessionResult.isError) {
    return await handleGetCredentialFailure(
      getCredentialFromBiometricSessionResult.value,
      errorTxmaEventName,
      eventService,
      sessionAttributes,
      config.IPVCORE_OUTBOUND_SQS,
      dependencies.sendMessageToSqs,
    );
  }

  const { credential } = getCredentialFromBiometricSessionResult.value;
  const credentialJwt = buildCredentialJwt(
    config.ISSUER,
    sessionAttributes,
    credential,
  );

  const createSignedJwtResult = await dependencies.createSignedJwt(
    credentialJwt,
    "ES256",
  );
  if (createSignedJwtResult.isError) {
    return;
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

const handleGetSessionError = async (
  options: HandleGetSessionErrorParameters,
): Promise<void> => {
  const { errorData, eventName, eventService, issuer, sessionId } = options;

  if (errorData.errorType === GetSessionError.INTERNAL_SERVER_ERROR) {
    throw new RetainMessageOnQueue(
      "Unexpected failure retrieving session from database",
    );
  }

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

const handleSendErrorMessageToOutboundQueue = async (
  dependencies: IssueBiometricCredentialDependencies,
  sessionAttributes: SessionAttributes,
  config: IssueBiometricCredentialConfig,
  error: { error: string; error_description: string },
): Promise<Result<void, void>> => {
  const ipvCoreOutboundMessage: OutboundQueueErrorMessage = {
    sub: sessionAttributes.subjectIdentifier,
    state: sessionAttributes.clientState,
    ...error,
  };

  const sendMessageToIPVCoreOutboundQueueResult =
    await dependencies.sendMessageToSqs(
      config.IPVCORE_OUTBOUND_SQS,
      ipvCoreOutboundMessage,
    );
  return sendMessageToIPVCoreOutboundQueueResult;
};

interface HandleGetSessionErrorParameters {
  errorData: GetSessionFailed;
  eventName: GenericEventNames;
  eventService: IEventService;
  issuer: string;
  sessionId: string;
}

const handleGetCredentialFailure = async (
  error: GetCredentialError,
  eventName: GenericEventNames,
  eventService: IEventService,
  sessionAttributes: BiometricSessionFinishedAttributes,
  outboundQueue: string,
  sendMessageToSqs: (
    sqsArn: string,
    messageBody: OutboundQueueErrorMessage,
  ) => Promise<Result<void, void>>,
): Promise<void> => {
  const { errorCode, errorReason, data } = error;
  const {
    clientState,
    subjectIdentifier,
    sessionId,
    govukSigninJourneyId,
    issuer,
    redirectUri,
  } = sessionAttributes;
  let logMessage;
  let suspectedFraudSignal;
  let sqsMessage: OutboundQueueErrorMessage;

  const ipvOutboundMessageServerError: OutboundQueueErrorMessage = {
    sub: subjectIdentifier,
    state: clientState,
    error_description: "Internal server error",
    error: "server_error",
  };

  switch (errorCode) {
    case GetCredentialErrorCode.SUSPECTED_FRAUD:
      logMessage = LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_SUSPECTED_FRAUD;
      sqsMessage = {
        sub: subjectIdentifier,
        state: clientState,
        error_description: "Suspected fraud detected",
        error: "access_denied",
      };
      suspectedFraudSignal = errorReason;
      break;

    case GetCredentialErrorCode.PARSE_FAILURE:
      logMessage =
        LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_BIOMETRIC_SESSION_PARSE_FAILURE;
      sqsMessage = ipvOutboundMessageServerError;
      suspectedFraudSignal = undefined;
      break;

    case GetCredentialErrorCode.BIOMETRIC_SESSION_NOT_VALID:
      logMessage =
        LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_BIOMETRIC_SESSION_NOT_VALID;
      sqsMessage = ipvOutboundMessageServerError;
      suspectedFraudSignal = undefined;
      break;

    case GetCredentialErrorCode.VENDOR_LIKENESS_DISABLED:
      logMessage =
        LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_VENDOR_LIKENESS_DISABLED;
      sqsMessage = ipvOutboundMessageServerError;
      suspectedFraudSignal = undefined;
      break;
  }

  logger.error(logMessage, {
    data: {
      errorReason,
      ...data,
    },
  });

  await sendMessageToSqs(outboundQueue, sqsMessage);

  const writeEventResult = await eventService.writeGenericEvent({
    eventName,
    sub: subjectIdentifier,
    sessionId,
    govukSigninJourneyId,
    getNowInMilliseconds: Date.now,
    componentId: issuer,
    ipAddress: undefined,
    txmaAuditEncoded: undefined,
    redirect_uri: redirectUri,
    suspected_fraud_signal: suspectedFraudSignal,
  });
  if (writeEventResult.isError) {
    logger.error(LogMessage.ERROR_WRITING_AUDIT_EVENT, {
      data: {
        auditEventName: eventName,
      },
    });
  }
};

export const buildCredentialJwt = (
  issuer: string,
  sessionAttributes: BiometricSessionFinishedAttributes,
  credential: string,
): CredentialJwt => {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return {
    iat: nowInSeconds,
    iss: issuer,
    aud: sessionAttributes.issuer,
    sub: sessionAttributes.subjectIdentifier,
    nbf: nowInSeconds,
    jti: `urn:uuid:${randomUUID()}`,
    vc: credential,
  };
};
