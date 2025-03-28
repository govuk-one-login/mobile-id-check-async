import { GenericEventNames, IEventService } from "../../services/events/types";
import { logger } from "../logging/logger";
import { LogMessage } from "../logging/LogMessage";

/**
 * Options for writing error events
 */
export interface WriteErrorEventOptions {
  eventService: IEventService;
  eventName: GenericEventNames;
  sessionId: string;
  sub?: string;
  govukSigninJourneyId?: string;
  componentId: string;
  redirectUri?: string;
  suspectedFraudSignal?: string;
  ipAddress?: string;
  txmaAuditEncoded?: string;
  biometricSessionId?: string;
}

/**
 * Writes a 4XX error event
 */
export async function write4xxErrorEvent(
  options: WriteErrorEventOptions,
): Promise<boolean> {
  const {
    eventService,
    sessionId,
    sub,
    govukSigninJourneyId,
    componentId,
    redirectUri,
    suspectedFraudSignal,
    ipAddress = "",
    txmaAuditEncoded,
    biometricSessionId,
  } = options;

  const writeEventResult = await eventService.writeGenericEvent({
    eventName: "DCMAW_ASYNC_CRI_4XXERROR",
    sessionId,
    sub,
    govukSigninJourneyId,
    componentId,
    getNowInMilliseconds: Date.now,
    redirect_uri: redirectUri,
    suspected_fraud_signal: suspectedFraudSignal,
    ipAddress,
    txmaAuditEncoded,
    transactionId: biometricSessionId,
  });

  if (writeEventResult.isError) {
    logger.error(LogMessage.ERROR_WRITING_AUDIT_EVENT, {
      data: { auditEventName: "DCMAW_ASYNC_CRI_4XXERROR" },
    });
    return false;
  }

  return true;
}

/**
 * Writes a 5XX error event
 */
export async function write5xxErrorEvent(
  options: WriteErrorEventOptions,
): Promise<boolean> {
  const {
    eventService,
    sessionId,
    sub,
    govukSigninJourneyId,
    componentId,
    ipAddress = "",
    txmaAuditEncoded,
    biometricSessionId,
  } = options;

  const writeEventResult = await eventService.writeGenericEvent({
    eventName: "DCMAW_ASYNC_CRI_5XXERROR",
    sessionId,
    sub,
    govukSigninJourneyId,
    componentId,
    getNowInMilliseconds: Date.now,
    redirect_uri: undefined,
    suspected_fraud_signal: undefined,
    ipAddress,
    txmaAuditEncoded,
    transactionId: biometricSessionId,
  });

  if (writeEventResult.isError) {
    logger.error(LogMessage.ERROR_WRITING_AUDIT_EVENT, {
      data: { auditEventName: "DCMAW_ASYNC_CRI_5XXERROR" },
    });
    return false;
  }

  return true;
}

/**
 * Writes an application event
 */
export async function writeAppEvent(
  options: WriteErrorEventOptions,
): Promise<boolean> {
  const {
    eventService,
    eventName,
    sessionId,
    sub,
    govukSigninJourneyId,
    componentId,
    redirectUri,
    ipAddress = "",
    txmaAuditEncoded,
    biometricSessionId,
  } = options;

  const writeEventResult = await eventService.writeGenericEvent({
    eventName,
    sessionId,
    sub,
    govukSigninJourneyId,
    componentId,
    getNowInMilliseconds: Date.now,
    redirect_uri: redirectUri,
    suspected_fraud_signal: undefined,
    ipAddress,
    txmaAuditEncoded,
    transactionId: biometricSessionId,
  });

  if (writeEventResult.isError) {
    logger.error(LogMessage.ERROR_WRITING_AUDIT_EVENT, {
      data: { auditEventName: eventName },
    });
    return false;
  }

  return true;
}

/**
 * Writes an app end event
 */
export async function writeAppEndEvent(
  options: WriteErrorEventOptions,
): Promise<boolean> {
  const {
    eventService,
    sessionId,
    sub,
    govukSigninJourneyId,
    componentId,
    redirectUri,
    ipAddress = "",
    txmaAuditEncoded,
    biometricSessionId,
  } = options;

  const writeEventResult = await eventService.writeGenericEvent({
    eventName: "DCMAW_ASYNC_APP_END",
    sessionId,
    sub,
    govukSigninJourneyId,
    componentId,
    getNowInMilliseconds: Date.now,
    redirect_uri: redirectUri,
    suspected_fraud_signal: undefined,
    ipAddress,
    txmaAuditEncoded,
    transactionId: biometricSessionId,
  });

  if (writeEventResult.isError) {
    logger.error(LogMessage.ERROR_WRITING_AUDIT_EVENT, {
      data: { auditEventName: "DCMAW_ASYNC_APP_END" },
    });
    return false;
  }

  return true;
}
