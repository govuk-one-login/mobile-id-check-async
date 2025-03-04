import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import {
  badRequestResponse,
  forbiddenResponse,
  notImplementedResponse,
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
} from "../common/session/SessionRegistry";
import { BiometricSessionFinished } from "../common/session/updateOperations/BiometricSessionFinished/BiometricSessionFinished";
import { getFinishBiometricSessionConfig } from "./finishBiometricSessionConfig";
import { IEventService } from "../services/events/types";
import { FailureWithValue } from "../utils/result";
import {
  BiometricSessionFinishedAttributes,
  SessionAttributes,
} from "../common/session/session";
import { setupLogger } from "../common/logging/setupLogger";
import { sendMessageToSqs } from "../adapters/sqs/sendMessageToSqs";
import { getAuditData } from "../common/request/getAuditData/getAuditData";

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
  const { sessionId, biometricSessionId } = validateResult.value;

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
    );
  }

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
      sessionAttributes: updateResult.value
        .attributes as BiometricSessionFinishedAttributes,
      issuer: config.ISSUER,
      biometricSessionId,
      ipAddress,
      txmaAuditEncoded,
    });
  }

  logger.info(LogMessage.FINISH_BIOMETRIC_SESSION_COMPLETED);
  return notImplementedResponse;
}

async function handleConditionalCheckFailure(
  eventService: IEventService,
  sessionAttributes: SessionAttributes,
  biometricSessionId: string,
  issuer: string,
): Promise<APIGatewayProxyResult> {
  const sessionAge = Date.now() - sessionAttributes.createdAt;
  const isSessionExpired = sessionAge > 60 * 60 * 1000;

  function getFraudSignal(
    expired: boolean,
  ): Record<string, string> | undefined {
    if (!expired) {
      return undefined;
    }

    return { suspected_fraud_signal: "AUTH_SESSION_TOO_OLD" };
  }

  const writeEventResult = await eventService.writeGenericEvent({
    eventName: "DCMAW_ASYNC_CRI_4XXERROR",
    sub: sessionAttributes.subjectIdentifier,
    sessionId: sessionAttributes.sessionId,
    govukSigninJourneyId: sessionAttributes.govukSigninJourneyId,
    componentId: issuer,
    getNowInMilliseconds: Date.now,
    transactionId: biometricSessionId,
    extensions: getFraudSignal(isSessionExpired),
    ipAddress: undefined,
    txmaAuditEncoded: undefined,
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
): Promise<APIGatewayProxyResult> {
  const writeEventResult = await eventService.writeGenericEvent({
    eventName: "DCMAW_ASYNC_CRI_4XXERROR",
    sessionId,
    sub: undefined,
    govukSigninJourneyId: undefined,
    componentId: issuer,
    getNowInMilliseconds: Date.now,
    transactionId: biometricSessionId,
    ipAddress: undefined,
    txmaAuditEncoded: undefined,
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
): Promise<APIGatewayProxyResult> {
  const writeEventResult = await eventService.writeGenericEvent({
    eventName: "DCMAW_ASYNC_CRI_5XXERROR",
    sessionId,
    sub: undefined,
    govukSigninJourneyId: undefined,
    componentId: issuer,
    getNowInMilliseconds: Date.now,
    transactionId: biometricSessionId,
    ipAddress: undefined,
    txmaAuditEncoded: undefined,
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
): Promise<APIGatewayProxyResult> {
  switch (updateSessionResult.value.errorType) {
    case UpdateSessionError.CONDITIONAL_CHECK_FAILURE:
      return handleConditionalCheckFailure(
        eventService,
        updateSessionResult.value.attributes,
        biometricSessionId,
        issuer,
      );
    case UpdateSessionError.SESSION_NOT_FOUND:
      return handleSessionNotFound(
        eventService,
        sessionId,
        biometricSessionId,
        issuer,
      );
    case UpdateSessionError.INTERNAL_SERVER_ERROR:
      return handleInternalServerError(
        eventService,
        sessionId,
        biometricSessionId,
        issuer,
      );
  }
}

interface HandleSendMessageToSqsFailureData {
  sessionAttributes: BiometricSessionFinishedAttributes;
  issuer: string;
  biometricSessionId: string;
  ipAddress: string;
  txmaAuditEncoded: string | undefined;
}

const handleSendMessageToVendorProcessingQueueFailure = async (
  eventService: IEventService,
  data: HandleSendMessageToSqsFailureData,
): Promise<APIGatewayProxyResult> => {
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
