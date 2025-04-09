import { APIGatewayProxyResult } from "aws-lambda";
import { serverErrorResponse, unauthorizedResponse } from "../lambdaResponses";
import { IEventService } from "../../services/events/types";
import { FailureWithValue } from "../../utils/result";
import { SessionAttributes } from "../session/session";
import { logger } from "../logging/logger";
import { LogMessage } from "../logging/LogMessage";
import { isOlderThan60Minutes } from "../../utils/utils";
import {
  SessionUpdateFailed,
  UpdateSessionError,
} from "../session/SessionRegistry/types";

/**
 * Options for handling conditional check failures
 */
export interface ConditionalCheckFailureOptions {
  eventService: IEventService;
  sessionAttributes: SessionAttributes;
  issuer: string;
  ipAddress?: string;
  txmaAuditEncoded?: string;
  biometricSessionId?: string;
}

/**
 * Handles conditional check failures when updating a session
 */
export async function handleConditionalCheckFailure(
  options: ConditionalCheckFailureOptions,
): Promise<APIGatewayProxyResult> {
  const {
    eventService,
    sessionAttributes,
    issuer,
    ipAddress = "",
    txmaAuditEncoded,
    biometricSessionId,
  } = options;

  // Check if session is expired using either utility or direct calculation
  const isSessionExpired = isOlderThan60Minutes(sessionAttributes.createdAt);

  const getFraudSignal = (): string | undefined => {
    if (isSessionExpired) return "AUTH_SESSION_TOO_OLD";
    return undefined;
  };

  const writeEventResult = await eventService.writeGenericEvent({
    eventName: "DCMAW_ASYNC_CRI_4XXERROR",
    sub: sessionAttributes.subjectIdentifier,
    sessionId: sessionAttributes.sessionId,
    govukSigninJourneyId: sessionAttributes.govukSigninJourneyId,
    componentId: issuer,
    getNowInMilliseconds: Date.now,
    transactionId: biometricSessionId,
    ipAddress,
    txmaAuditEncoded,
    redirect_uri: sessionAttributes.redirectUri,
    suspected_fraud_signal: getFraudSignal(),
  });

  if (writeEventResult.isError) {
    logger.error(LogMessage.ERROR_WRITING_AUDIT_EVENT, {
      data: { auditEventName: "DCMAW_ASYNC_CRI_4XXERROR" },
    });
    return serverErrorResponse;
  }

  if (isSessionExpired) {
    return unauthorizedResponse("expired_session", "Session has expired");
  }

  return unauthorizedResponse("invalid_session", "Session in invalid state");
}

/**
 * Options for handling session not found errors
 */
export interface SessionNotFoundOptions {
  eventService: IEventService;
  sessionId: string;
  issuer: string;
  ipAddress?: string;
  txmaAuditEncoded?: string;
  biometricSessionId?: string;
}

/**
 * Handles session not found errors
 */
export async function handleSessionNotFound(
  options: SessionNotFoundOptions,
): Promise<APIGatewayProxyResult> {
  const {
    eventService,
    sessionId,
    issuer,
    ipAddress = "",
    txmaAuditEncoded,
    biometricSessionId,
  } = options;

  const writeEventResult = await eventService.writeGenericEvent({
    eventName: "DCMAW_ASYNC_CRI_4XXERROR",
    sessionId,
    sub: undefined,
    govukSigninJourneyId: undefined,
    componentId: issuer,
    getNowInMilliseconds: Date.now,
    transactionId: biometricSessionId,
    redirect_uri: undefined,
    suspected_fraud_signal: undefined,
    ipAddress,
    txmaAuditEncoded,
  });

  if (writeEventResult.isError) {
    logger.error(LogMessage.ERROR_WRITING_AUDIT_EVENT, {
      data: { auditEventName: "DCMAW_ASYNC_CRI_4XXERROR" },
    });
    return serverErrorResponse;
  }

  return unauthorizedResponse("invalid_session", "Session not found");
}

/**
 * Options for handling internal server errors
 */
export interface InternalServerErrorOptions {
  eventService: IEventService;
  sessionId: string;
  issuer: string;
  ipAddress?: string;
  txmaAuditEncoded?: string;
  biometricSessionId?: string;
  sub?: string;
  govukSigninJourneyId?: string;
}

/**
 * Handles internal server errors
 */
export async function handleInternalServerError(
  options: InternalServerErrorOptions,
): Promise<APIGatewayProxyResult> {
  const {
    eventService,
    sessionId,
    issuer,
    ipAddress = "",
    txmaAuditEncoded,
    biometricSessionId,
    sub,
    govukSigninJourneyId,
  } = options;

  const writeEventResult = await eventService.writeGenericEvent({
    eventName: "DCMAW_ASYNC_CRI_5XXERROR",
    sessionId,
    sub,
    govukSigninJourneyId,
    componentId: issuer,
    getNowInMilliseconds: Date.now,
    transactionId: biometricSessionId,
    redirect_uri: undefined,
    suspected_fraud_signal: undefined,
    ipAddress,
    txmaAuditEncoded,
  });

  if (writeEventResult.isError) {
    logger.error(LogMessage.ERROR_WRITING_AUDIT_EVENT, {
      data: { auditEventName: "DCMAW_ASYNC_CRI_5XXERROR" },
    });
  }

  return serverErrorResponse;
}

/**
 * Options for handling update session errors
 */
export interface UpdateSessionErrorOptions {
  updateSessionResult: FailureWithValue<SessionUpdateFailed>;
  eventService: IEventService;
  sessionId: string;
  issuer: string;
  ipAddress?: string;
  txmaAuditEncoded?: string;
  biometricSessionId?: string;
}

/**
 * Handles all session update errors by delegating to the appropriate handler
 */
export async function handleUpdateSessionError(
  options: UpdateSessionErrorOptions,
): Promise<APIGatewayProxyResult> {
  const {
    updateSessionResult,
    eventService,
    sessionId,
    issuer,
    ipAddress = "",
    txmaAuditEncoded,
    biometricSessionId,
  } = options;

  switch (updateSessionResult.value.errorType) {
    case UpdateSessionError.CONDITIONAL_CHECK_FAILURE:
      return handleConditionalCheckFailure({
        eventService,
        sessionAttributes: updateSessionResult.value.attributes,
        issuer,
        ipAddress,
        txmaAuditEncoded,
        biometricSessionId,
      });
    case UpdateSessionError.SESSION_NOT_FOUND:
      return handleSessionNotFound({
        eventService,
        sessionId,
        issuer,
        ipAddress,
        txmaAuditEncoded,
        biometricSessionId,
      });
    case UpdateSessionError.INTERNAL_SERVER_ERROR:
      return handleInternalServerError({
        eventService,
        sessionId,
        issuer,
        ipAddress,
        txmaAuditEncoded,
        biometricSessionId,
      });
  }
}
