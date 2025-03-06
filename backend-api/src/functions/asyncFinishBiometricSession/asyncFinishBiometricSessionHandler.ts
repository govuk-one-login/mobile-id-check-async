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
import {
  GenericEventConfig,
  GenericEventNames,
  IEventService,
} from "../services/events/types";
import { FailureWithValue } from "../utils/result";
import { SessionAttributes } from "../common/session/session";
import { setupLogger } from "../common/logging/setupLogger";

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

  logger.info(LogMessage.FINISH_BIOMETRIC_SESSION_COMPLETED);
  return notImplementedResponse;
}

const buildEvent = (
  config: GenericEventConfig,
  includeSessionRegistry: boolean = true,
): GenericEventConfig => {
  return {
    eventName: config.eventName,
    sub: includeSessionRegistry ? config.sub : undefined,
    sessionId: config.sessionId,
    govukSigninJourneyId: includeSessionRegistry
      ? config.govukSigninJourneyId
      : undefined,
    componentId: config.componentId,
    getNowInMilliseconds: Date.now,
    transactionId: config.transactionId,
    redirect_uri: config.redirect_uri,
    suspected_fraud_signal: config.suspected_fraud_signal,
    ipAddress: undefined,
    txmaAuditEncoded: undefined,
  };
};

// These functions can now be simplified to call the unified builder
const buildEventWithSessionRegistryData = (
  config: GenericEventConfig,
): GenericEventConfig => {
  return buildEvent(config, true);
};

const buildEventWithoutSessionRegistryData = (
  config: GenericEventConfig,
): GenericEventConfig => {
  return buildEvent(config, false);
};

async function handleConditionalCheckFailure(
  eventService: IEventService,
  sessionAttributes: SessionAttributes,
  biometricSessionId: string,
  issuer: string,
): Promise<APIGatewayProxyResult> {
  const sessionAge = Date.now() - sessionAttributes.createdAt;
  const isSessionExpired = sessionAge > 60 * 60 * 1000;

  function getFraudSignal(expired: boolean): string | undefined {
    if (!expired) {
      return undefined;
    }

    return "AUTH_SESSION_TOO_OLD";
  }

  const txmaEvent: GenericEventConfig = {
    eventName: "DCMAW_ASYNC_CRI_4XXERROR" as GenericEventNames,
    sub: sessionAttributes.subjectIdentifier,
    sessionId: sessionAttributes.sessionId,
    govukSigninJourneyId: sessionAttributes.govukSigninJourneyId,
    componentId: issuer,
    getNowInMilliseconds: Date.now,
    transactionId: biometricSessionId,
    redirect_uri: sessionAttributes.redirectUri,
    suspected_fraud_signal: getFraudSignal(isSessionExpired),
    ipAddress: undefined,
    txmaAuditEncoded: undefined,
  };

  const writeEventResult = await eventService.writeGenericEvent(
    buildEventWithSessionRegistryData(txmaEvent),
  );

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
  const txmaEvent: GenericEventConfig = {
    eventName: "DCMAW_ASYNC_CRI_4XXERROR" as GenericEventNames,
    sub: undefined,
    sessionId,
    govukSigninJourneyId: undefined,
    componentId: issuer,
    getNowInMilliseconds: Date.now,
    transactionId: biometricSessionId,
    redirect_uri: undefined,
    suspected_fraud_signal: undefined,
    ipAddress: undefined,
    txmaAuditEncoded: undefined,
  };
  const writeEventResult = await eventService.writeGenericEvent(
    buildEventWithoutSessionRegistryData(txmaEvent),
  );

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
  const txmaEvent: GenericEventConfig = {
    eventName: "DCMAW_ASYNC_CRI_5XXERROR" as GenericEventNames,
    sub: undefined,
    sessionId,
    govukSigninJourneyId: undefined,
    componentId: issuer,
    getNowInMilliseconds: Date.now,
    transactionId: biometricSessionId,
    redirect_uri: undefined,
    suspected_fraud_signal: undefined,
    ipAddress: undefined,
    txmaAuditEncoded: undefined,
  };
  const writeEventResult = await eventService.writeGenericEvent(
    buildEventWithoutSessionRegistryData(txmaEvent),
  );

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

export const lambdaHandler = lambdaHandlerConstructor.bind(
  null,
  runtimeDependencies,
);
