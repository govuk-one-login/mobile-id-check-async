import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import {
  badRequestResponse,
  forbiddenResponse,
  okResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "../common/lambdaResponses";
import {
  IAsyncFinishBiometricSessionDependencies,
  runtimeDependencies,
} from "./handlerDependencies";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { validateRequestBody } from "./validateRequestBody/validateRequestBody";
import {
  SessionUpdateFailed,
  UpdateSessionError,
} from "../common/session/SessionRegistry/types";
import { BiometricSessionFinished } from "../common/session/updateOperations/BiometricSessionFinished/BiometricSessionFinished";
import { getFinishBiometricSessionConfig } from "./finishBiometricSessionConfig";
import { IEventService } from "../services/events/types";
import { FailureWithValue } from "../utils/result";
import {
  BiometricSessionFinishedAttributes,
  SessionAttributes,
} from "../common/session/session";
import { setupLogger } from "../common/logging/setupLogger";
import { getAuditData } from "../common/request/getAuditData/getAuditData";
import { appendPersistentIdentifiersToLogger } from "../common/logging/helpers/appendPersistentIdentifiersToLogger";

export async function lambdaHandlerConstructor(
  dependencies: IAsyncFinishBiometricSessionDependencies,
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  setupLogger(context);
  logger.info(LogMessage.FINISH_BIOMETRIC_SESSION_STARTED);

  const configResult = getFinishBiometricSessionConfig(dependencies.env);
  if (configResult.isError) {
    return serverErrorResponse;
  }
  const config = configResult.value;

  const validateResult = validateRequestBody(event.body);
  if (validateResult.isError) {
    logger.error(LogMessage.FINISH_BIOMETRIC_SESSION_REQUEST_BODY_INVALID, {
      errorMessage: validateResult.value.errorMessage,
    });
    return badRequestResponse(
      "invalid_request",
      validateResult.value.errorMessage,
    );
  }
  const { biometricSessionId, sessionId } = validateResult.value;

  appendPersistentIdentifiersToLogger({ biometricSessionId, sessionId });

  const eventService = dependencies.getEventService(config.TXMA_SQS);
  const sessionRegistry = dependencies.getSessionRegistry(
    config.SESSION_TABLE_NAME,
  );
  const { ipAddress, txmaAuditEncoded } = getAuditData(event);

  const updateResult = await sessionRegistry.updateSession(
    sessionId,
    new BiometricSessionFinished(biometricSessionId),
  );
  if (updateResult.isError) {
    return handleUpdateSessionError(
      updateResult,
      eventService,
      sessionId,
      biometricSessionId,
      config.ISSUER,
      ipAddress,
      txmaAuditEncoded,
    );
  }
  const sessionAttributes = updateResult.value
    .attributes as BiometricSessionFinishedAttributes;

  appendPersistentIdentifiersToLogger({
    govukSigninJourneyId: sessionAttributes.govukSigninJourneyId,
  });

  const sendMessageToSqs = dependencies.getSendMessageToSqs();
  const vendorProcessingMessage = {
    biometricSessionId,
    sessionId,
  };

  const sendMessageToVendorProcessingQueueResult = await sendMessageToSqs(
    config.VENDOR_PROCESSING_SQS,
    vendorProcessingMessage,
  );
  if (sendMessageToVendorProcessingQueueResult.isError) {
    return await handleSendMessageToVendorProcessingQueueFailure(eventService, {
      sessionAttributes,
      issuer: config.ISSUER,
      biometricSessionId,
      ipAddress,
      txmaAuditEncoded,
    });
  }

  const writeAppEndEventResult = await eventService.writeGenericEvent({
    eventName: "DCMAW_ASYNC_APP_END",
    sub: sessionAttributes.subjectIdentifier,
    sessionId: sessionAttributes.sessionId,
    govukSigninJourneyId: sessionAttributes.govukSigninJourneyId,
    componentId: config.ISSUER,
    getNowInMilliseconds: Date.now,
    transactionId: biometricSessionId,
    redirect_uri: sessionAttributes.redirectUri,
    suspected_fraud_signal: undefined,
    ipAddress,
    txmaAuditEncoded,
  });
  if (writeAppEndEventResult.isError) {
    logger.error(LogMessage.ERROR_WRITING_AUDIT_EVENT, {
      data: {
        auditEventName: "DCMAW_ASYNC_APP_END",
      },
    });
    return serverErrorResponse;
  }

  logger.info(LogMessage.FINISH_BIOMETRIC_SESSION_COMPLETED);
  return okResponse();
}

async function handleConditionalCheckFailure(
  eventService: IEventService,
  sessionAttributes: SessionAttributes,
  biometricSessionId: string,
  issuer: string,
  ipAddress: string,
  txmaAuditEncoded: string | undefined,
): Promise<APIGatewayProxyResult> {
  const sessionAge = Date.now() - sessionAttributes.createdAt;
  const isSessionExpired = sessionAge > 60 * 60 * 1000;

  function getFraudSignal(expired: boolean): string | undefined {
    if (!expired) {
      return undefined;
    }

    return "AUTH_SESSION_TOO_OLD";
  }

  const writeEventResult = await eventService.writeGenericEvent({
    eventName: "DCMAW_ASYNC_CRI_4XXERROR",
    sub: sessionAttributes.subjectIdentifier,
    sessionId: sessionAttributes.sessionId,
    govukSigninJourneyId: sessionAttributes.govukSigninJourneyId,
    componentId: issuer,
    getNowInMilliseconds: Date.now,
    transactionId: biometricSessionId,
    redirect_uri: sessionAttributes.redirectUri,
    suspected_fraud_signal: getFraudSignal(isSessionExpired),
    ipAddress,
    txmaAuditEncoded,
  });

  if (writeEventResult.isError) {
    logger.error(LogMessage.ERROR_WRITING_AUDIT_EVENT, {
      data: { auditEventName: "DCMAW_ASYNC_CRI_4XXERROR" },
    });
    return serverErrorResponse;
  }

  if (isSessionExpired) {
    return forbiddenResponse("expired_session", "Session has expired");
  }

  return unauthorizedResponse("invalid_session", "Session in invalid state");
}

async function handleSessionNotFound(
  eventService: IEventService,
  sessionId: string,
  biometricSessionId: string,
  issuer: string,
  ipAddress: string,
  txmaAuditEncoded: string | undefined,
): Promise<APIGatewayProxyResult> {
  const writeEventResult = await eventService.writeGenericEvent({
    eventName: "DCMAW_ASYNC_CRI_4XXERROR",
    sessionId,
    sub: undefined,
    govukSigninJourneyId: undefined,
    componentId: issuer,
    getNowInMilliseconds: Date.now,
    transactionId: biometricSessionId,
    ipAddress,
    txmaAuditEncoded,
    redirect_uri: undefined,
    suspected_fraud_signal: undefined,
  });

  if (writeEventResult.isError) {
    logger.error(LogMessage.ERROR_WRITING_AUDIT_EVENT, {
      data: { auditEventName: "DCMAW_ASYNC_CRI_4XXERROR" },
    });
    return serverErrorResponse;
  }

  return unauthorizedResponse("invalid_session", "Session not found");
}

async function handleInternalServerError(
  eventService: IEventService,
  sessionId: string,
  biometricSessionId: string,
  issuer: string,
  ipAddress: string,
  txmaAuditEncoded: string | undefined,
): Promise<APIGatewayProxyResult> {
  const writeEventResult = await eventService.writeGenericEvent({
    eventName: "DCMAW_ASYNC_CRI_5XXERROR",
    sessionId,
    sub: undefined,
    govukSigninJourneyId: undefined,
    componentId: issuer,
    getNowInMilliseconds: Date.now,
    transactionId: biometricSessionId,
    ipAddress,
    txmaAuditEncoded,
    redirect_uri: undefined,
    suspected_fraud_signal: undefined,
  });

  if (writeEventResult.isError) {
    logger.error(LogMessage.ERROR_WRITING_AUDIT_EVENT, {
      data: { auditEventName: "DCMAW_ASYNC_CRI_5XXERROR" },
    });
  }

  return serverErrorResponse;
}

async function handleUpdateSessionError(
  updateSessionResult: FailureWithValue<SessionUpdateFailed>,
  eventService: IEventService,
  sessionId: string,
  biometricSessionId: string,
  issuer: string,
  ipAddress: string,
  txmaAuditEncoded: string | undefined,
): Promise<APIGatewayProxyResult> {
  switch (updateSessionResult.value.errorType) {
    case UpdateSessionError.CONDITIONAL_CHECK_FAILURE:
      return handleConditionalCheckFailure(
        eventService,
        updateSessionResult.value.attributes,
        biometricSessionId,
        issuer,
        ipAddress,
        txmaAuditEncoded,
      );
    case UpdateSessionError.SESSION_NOT_FOUND:
      return handleSessionNotFound(
        eventService,
        sessionId,
        biometricSessionId,
        issuer,
        ipAddress,
        txmaAuditEncoded,
      );
    case UpdateSessionError.INTERNAL_SERVER_ERROR:
      return handleInternalServerError(
        eventService,
        sessionId,
        biometricSessionId,
        issuer,
        ipAddress,
        txmaAuditEncoded,
      );
  }
}

interface HandleSendMessageToVendorProcessingQueueFailureData {
  sessionAttributes: BiometricSessionFinishedAttributes;
  issuer: string;
  biometricSessionId: string;
  ipAddress: string;
  txmaAuditEncoded: string | undefined;
}

const handleSendMessageToVendorProcessingQueueFailure = async (
  eventService: IEventService,
  data: HandleSendMessageToVendorProcessingQueueFailureData,
): Promise<APIGatewayProxyResult> => {
  logger.error(
    LogMessage.FINISH_BIOMETRIC_SESSION_SEND_MESSAGE_TO_VENDOR_PROCESSING_QUEUE_FAILURE,
  );

  const {
    biometricSessionId,
    issuer,
    ipAddress,
    sessionAttributes,
    txmaAuditEncoded,
  } = data;
  const { subjectIdentifier, sessionId, govukSigninJourneyId } =
    sessionAttributes;

  const writeEventResult = await eventService.writeGenericEvent({
    eventName: "DCMAW_ASYNC_CRI_5XXERROR",
    sub: subjectIdentifier,
    sessionId,
    govukSigninJourneyId,
    componentId: issuer,
    getNowInMilliseconds: Date.now,
    transactionId: biometricSessionId,
    ipAddress,
    txmaAuditEncoded,
    redirect_uri: undefined,
    suspected_fraud_signal: undefined,
  });

  if (writeEventResult.isError) {
    logger.error(LogMessage.ERROR_WRITING_AUDIT_EVENT, {
      data: { auditEventName: "DCMAW_ASYNC_CRI_5XXERROR" },
    });
  }

  return serverErrorResponse;
};

export const lambdaHandler = lambdaHandlerConstructor.bind(
  null,
  runtimeDependencies,
);
