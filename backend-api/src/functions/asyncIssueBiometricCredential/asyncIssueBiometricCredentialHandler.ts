import { Context, SQSEvent, SQSRecord } from "aws-lambda";
import { GetSecrets } from "../common/config/secrets";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { setupLogger } from "../common/logging/setupLogger";
import {
  GetSessionError,
  GetSessionFailed,
} from "../common/session/SessionRegistry/types";
import {
  emptyFailure,
  emptySuccess,
  Result,
  successResult,
} from "../utils/result";
import {
  IssueBiometricCredentialDependencies,
  runtimeDependencies,
} from "./handlerDependencies";
import {
  getIssueBiometricCredentialConfig,
  IssueBiometricCredentialConfig,
} from "./issueBiometricCredentialConfig";
import { validateVendorProcessingQueueSqsEvent } from "./validateSqsEvent";

import {
  OutboundQueueErrorMessage,
  VerifiableCredentialMessage,
} from "../adapters/aws/sqs/types";

import {
  Advisory,
  AuditData,
  BiometricCredential,
  FraudCheckData,
  GetCredentialError,
  GetCredentialErrorCode,
  GetCredentialOptions,
} from "@govuk-one-login/mobile-id-check-biometric-credential";
import { randomUUID } from "crypto";
import { appendPersistentIdentifiersToLogger } from "../common/logging/helpers/appendPersistentIdentifiersToLogger";
import { GetSessionIssueBiometricCredential } from "../common/session/getOperations/IssueBiometricCredential/GetSessionIssueBiometricCredential";
import {
  BiometricSessionFinishedAttributes,
  SessionAttributes,
  SessionState,
} from "../common/session/session";
import { ResultSent } from "../common/session/updateOperations/ResultSent/ResultSent";
import { GenericEventNames, IEventService } from "../services/events/types";
import { CredentialJwtPayload } from "../types/jwt";
import { GetBiometricSessionError } from "./getBiometricSession/getBiometricSession";
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
  const sqsMessage = event.Records[0];

  appendPersistentIdentifiersToLogger({ sessionId });
  appendSqsMessagePropertiesToLogger(sqsMessage);

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

  const sessionAttributes =
    getSessionResult.value as BiometricSessionFinishedAttributes;

  appendPersistentIdentifiersToLogger({
    biometricSessionId: sessionAttributes.biometricSessionId,
    govukSigninJourneyId: sessionAttributes.govukSigninJourneyId,
  });
  appendDocumentTypeToLogger(sessionAttributes.documentType);

  if (getSessionResult.value.sessionState === SessionState.RESULT_SENT) {
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
  const { biometricSessionId } = sessionAttributes;

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
        { data: { messageType: "ERROR_MESSAGE" } },
      );
    }

    const writeEventResult = await eventService.writeGenericEvent({
      eventName: getErrorEventName(),
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

    if (writeEventResult.isError) logErrorWritingErrorEvent();

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
      eventService,
      sessionAttributes,
      config.IPVCORE_OUTBOUND_SQS,
      dependencies.sendMessageToSqs,
    );
  }

  const { credential, audit, advisories } =
    getCredentialFromBiometricSessionResult.value;

  logIfExpiredDrivingLicence(credential, advisories);

  const credentialJwtPayload = buildCredentialJwtPayload({
    credential,
    issuer: config.ISSUER,
    sub: sessionAttributes.subjectIdentifier,
  });

  const createKmsSignedJwtResult = await dependencies.createKmsSignedJwt(
    config.VERIFIABLE_CREDENTIAL_SIGNING_KEY_ID,
    credentialJwtPayload,
  );
  if (createKmsSignedJwtResult.isError) {
    throw new RetainMessageOnQueue(
      "Unexpected failure signing verified credential jwt",
    );
  }

  const sendVerifiableCredentialMessageToSqsResult =
    await sendVerifiableCredentialMessageToSqs(
      createKmsSignedJwtResult.value,
      sessionAttributes,
      dependencies.sendMessageToSqs,
      config.IPVCORE_OUTBOUND_SQS,
    );

  if (sendVerifiableCredentialMessageToSqsResult.isError) {
    throw new RetainMessageOnQueue(
      "Unexpected failure writing the VC to the IPVCore outbound queue",
    );
  }

  logger.info(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_VC_ISSUED, {
    vendorProcessingQueueToVcIssuanceElapsedTimeInMs:
      getVendorProcessingQueueToVcIssuanceElapsedTimeInMs(sqsMessage),
  });

  const updateSessionResult = await sessionRegistry.updateSession(
    sessionId,
    new ResultSent(sessionId),
  );
  if (updateSessionResult.isError) {
    handleUpdateSessionError({
      sessionAttributes,
      issuer: config.ISSUER,
      eventService,
    });
    return;
  }

  const writeVCIssuedEventResult = await writeVcIssuedEvent(
    eventService,
    sessionAttributes,
    credential,
    audit,
  );
  if (writeVCIssuedEventResult.isError) {
    return;
  }

  const writeCriEndEventResult = await writeCriEndEvent(
    eventService,
    sessionAttributes,
  );
  if (writeCriEndEventResult.isError) {
    return;
  }

  logger.info(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED, {
    outboundSqsMessageResponseProperties: {
      messageId: sendVerifiableCredentialMessageToSqsResult.value,
    },
  });
}

export const lambdaHandler = lambdaHandlerConstructor.bind(
  null,
  runtimeDependencies,
);

const appendSqsMessagePropertiesToLogger = (sqsRecord: SQSRecord): void => {
  logger.appendKeys({
    sqsMessageProperties: {
      messageId: sqsRecord.messageId,
      approximateReceiveCount: sqsRecord.attributes.ApproximateReceiveCount,
    },
  });
};

const appendDocumentTypeToLogger = (documentType: string): void => {
  logger.appendKeys({ documentType });
};

const getVendorProcessingQueueToVcIssuanceElapsedTimeInMs = (
  sqsRecord: SQSRecord,
): number => {
  return Date.now() - Number(sqsRecord.attributes.SentTimestamp);
};

const getBiometricViewerAccessKey = async (
  path: string,
  cacheDurationInSeconds: number,
  getSecrets: GetSecrets,
): Promise<Result<string, void>> => {
  const getViewerKeyResult = await getSecrets({
    secretNames: [path],
    cacheDurationInSeconds,
  });
  if (getViewerKeyResult.isError) {
    return emptyFailure();
  }

  const secretsByName = getViewerKeyResult.value;
  return successResult(secretsByName[path]);
};

const handleGetSessionError = async (
  options: HandleGetSessionErrorParameters,
): Promise<void> => {
  const { errorData, eventService, issuer, sessionId } = options;

  if (errorData.errorType === GetSessionError.INTERNAL_SERVER_ERROR) {
    throw new RetainMessageOnQueue(
      "Unexpected failure retrieving session from database",
    );
  }

  const writeEventResult = await eventService.writeGenericEvent({
    componentId: issuer,
    eventName: getErrorEventName(),
    getNowInMilliseconds: Date.now,
    govukSigninJourneyId: undefined,
    ipAddress: undefined,
    redirect_uri: undefined,
    sessionId,
    sub: undefined,
    suspected_fraud_signal: undefined,
    txmaAuditEncoded: undefined,
  });
  if (writeEventResult.isError) logErrorWritingErrorEvent();
};

const getErrorEventName = (): GenericEventNames => "DCMAW_ASYNC_CRI_ERROR";

const logErrorWritingErrorEvent = (): void => {
  logger.error(LogMessage.ERROR_WRITING_AUDIT_EVENT, {
    data: {
      auditEventName: getErrorEventName(),
    },
  });
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
    govuk_signin_journey_id: sessionAttributes.govukSigninJourneyId,
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
  eventService: IEventService;
  issuer: string;
  sessionId: string;
}

const handleGetCredentialFailure = async (
  error: GetCredentialError,
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
    govuk_signin_journey_id: govukSigninJourneyId,
    error_description: "Internal server error",
    error: "server_error",
  };

  switch (errorCode) {
    case GetCredentialErrorCode.SUSPECTED_FRAUD:
      logMessage = LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_SUSPECTED_FRAUD;
      sqsMessage = {
        sub: subjectIdentifier,
        state: clientState,
        govuk_signin_journey_id: govukSigninJourneyId,
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
    eventName: getErrorEventName(),
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
  if (writeEventResult.isError) logErrorWritingErrorEvent();
};

const sendVerifiableCredentialMessageToSqs = async (
  verifiableCredentialJwt: string,
  sessionAttributes: BiometricSessionFinishedAttributes,
  sendMessageToSqs: (
    sqsArn: string,
    messageBody: VerifiableCredentialMessage,
  ) => Promise<Result<string | undefined, void>>,
  sqsArn: string,
): Promise<Result<string | undefined, void>> => {
  const verifiableCredentialMessage: VerifiableCredentialMessage = {
    sub: sessionAttributes.subjectIdentifier,
    state: sessionAttributes.clientState,
    "https://vocab.account.gov.uk/v1/credentialJWT": [verifiableCredentialJwt],
    govuk_signin_journey_id: sessionAttributes.govukSigninJourneyId,
  };

  const sendMessageToSqsResult = await sendMessageToSqs(
    sqsArn,
    verifiableCredentialMessage,
  );

  if (sendMessageToSqsResult.isError) {
    logger.error(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_IPV_CORE_MESSAGE_ERROR, {
      data: { messageType: "VERIFIABLE_CREDENTIAL" },
    });

    return emptyFailure();
  }

  return successResult(sendMessageToSqsResult.value);
};

interface HandleUpdateSessionErrorParameters {
  eventService: IEventService;
  issuer: string;
  sessionAttributes: BiometricSessionFinishedAttributes;
}

const handleUpdateSessionError = async (
  options: HandleUpdateSessionErrorParameters,
): Promise<void> => {
  const { eventService, issuer, sessionAttributes } = options;

  const writeEventResult = await eventService.writeGenericEvent({
    componentId: issuer,
    eventName: getErrorEventName(),
    getNowInMilliseconds: Date.now,
    govukSigninJourneyId: sessionAttributes.govukSigninJourneyId,
    ipAddress: undefined,
    redirect_uri: sessionAttributes.redirectUri,
    sessionId: sessionAttributes.sessionId,
    sub: sessionAttributes.subjectIdentifier,
    suspected_fraud_signal: undefined,
    txmaAuditEncoded: undefined,
  });
  if (writeEventResult.isError) logErrorWritingErrorEvent();
};
export const buildCredentialJwtPayload = (jwtData: {
  credential: BiometricCredential;
  sub: string;
  issuer: string;
}): CredentialJwtPayload => {
  const { credential, issuer, sub } = jwtData;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return {
    iat: nowInSeconds,
    iss: issuer,
    jti: `urn:uuid:${randomUUID()}`,
    nbf: nowInSeconds,
    sub,
    vc: credential,
  };
};

const writeVcIssuedEvent = async (
  eventService: IEventService,
  sessionAttributes: BiometricSessionFinishedAttributes,
  credential: BiometricCredential,
  audit: AuditData,
): Promise<Result<void, void>> => {
  const {
    biometricSessionId,
    govukSigninJourneyId,
    subjectIdentifier,
    sessionId,
    issuer,
    redirectUri,
  } = sessionAttributes;
  const { credentialSubject } = credential;
  const { contraIndicatorReasons, txmaContraIndicators, flags, flaggedRecord } =
    audit;

  const hasFlags = flags != null;

  const writeEventResult = await eventService.writeGenericEvent({
    eventName: "DCMAW_ASYNC_CRI_VC_ISSUED",
    sub: subjectIdentifier,
    sessionId,
    govukSigninJourneyId,
    getNowInMilliseconds: Date.now,
    transactionId: biometricSessionId,
    componentId: issuer,
    ipAddress: undefined,
    txmaAuditEncoded: undefined,
    redirect_uri: redirectUri,
    suspected_fraud_signal: undefined,
    evidence: [
      {
        ...credential.evidence[0],
        ...(hasContraIndicators(credential) && {
          ciReasons: contraIndicatorReasons,
        }),
        txmaContraIndicators,
      },
    ],
    flaggedRecord: hasFlags ? flaggedRecord : undefined,
    credentialSubject,
    flags: hasFlags ? flags : undefined,
  });
  if (writeEventResult.isError) {
    logger.error(LogMessage.ERROR_WRITING_AUDIT_EVENT, {
      data: { auditEventName: "DCMAW_ASYNC_CRI_VC_ISSUED" },
    });
    return emptyFailure();
  }
  return emptySuccess();
};

const hasContraIndicators = (credential: BiometricCredential): boolean => {
  const credentialEvidence = credential.evidence[0];
  return "ci" in credentialEvidence && credentialEvidence.ci !== null;
};

const writeCriEndEvent = async (
  eventService: IEventService,
  sessionAttributes: BiometricSessionFinishedAttributes,
): Promise<Result<void, void>> => {
  const {
    govukSigninJourneyId,
    subjectIdentifier,
    sessionId,
    issuer,
    redirectUri,
    biometricSessionId,
  } = sessionAttributes;

  const writeCriEndEventResult = await eventService.writeGenericEvent({
    eventName: "DCMAW_ASYNC_CRI_END",
    sub: subjectIdentifier,
    sessionId,
    govukSigninJourneyId,
    transactionId: biometricSessionId,
    componentId: issuer,
    getNowInMilliseconds: Date.now,
    ipAddress: undefined,
    txmaAuditEncoded: undefined,
    redirect_uri: redirectUri,
    suspected_fraud_signal: undefined,
  });
  if (writeCriEndEventResult.isError) {
    logger.error(LogMessage.ERROR_WRITING_AUDIT_EVENT, {
      data: { auditEventName: "DCMAW_ASYNC_CRI_END" },
    });
    return emptyFailure();
  }
  return emptySuccess();
};

function logIfExpiredDrivingLicence(
  credential: BiometricCredential,
  advisories: Advisory[],
): void {
  const drivingLicenceExpiry =
    credential.credentialSubject.drivingPermit?.[0].expiryDate ?? "";
  if (
    advisories.includes(
      Advisory.VENDOR_CHECKS_PASSED_FOR_EXPIRED_DRIVING_LICENCE,
    )
  ) {
    logger.info(
      LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_VENDOR_CHECKS_PASSED_FOR_EXPIRED_DRIVING_LICENCE,
      {
        data: { expiryDate: drivingLicenceExpiry },
      },
    );
  }
}
