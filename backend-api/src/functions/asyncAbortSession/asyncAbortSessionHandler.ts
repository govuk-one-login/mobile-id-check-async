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
  IAsyncAbortSessionDependencies,
  runtimeDependencies,
} from "./handlerDependencies";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { validateRequestBody } from "./validateRequestBody/validateRequestBody";
import {
  SessionUpdateFailed,
  UpdateSessionError,
} from "../common/session/SessionRegistry";
import { AbortSession } from "../common/session/updateOperations/AbortSession/AbortSession";
import { getAbortSessionConfig } from "./abortSessionConfig";
import { IEventService } from "../services/events/types";
import { FailureWithValue } from "../utils/result";
import {
  AuthSessionAbortedAttributes,
  SessionAttributes,
} from "../common/session/session";
import { setupLogger } from "../common/logging/setupLogger";
import { getAuditData } from "../common/request/getAuditData/getAuditData";

export async function lambdaHandlerConstructor(
  dependencies: IAsyncAbortSessionDependencies,
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  setupLogger(context);
  logger.info(LogMessage.ABORT_SESSION_STARTED);

  const configResult = getAbortSessionConfig(dependencies.env);
  if (configResult.isError) {
    return serverErrorResponse;
  }
  const config = configResult.value;

  const validateResult = validateRequestBody(event.body);
  if (validateResult.isError) {
    logger.error(LogMessage.ABORT_SESSION_REQUEST_BODY_INVALID, {
      errorMessage: validateResult.value.errorMessage,
    });
    return badRequestResponse(
      "invalid_request",
      validateResult.value.errorMessage,
    );
  }
  const sessionId = validateResult.value;

  const eventService = dependencies.getEventService(config.TXMA_SQS);
  const sessionRegistry = dependencies.getSessionRegistry(
    config.SESSION_TABLE_NAME,
  );
  const { ipAddress, txmaAuditEncoded } = getAuditData(event);

  const updateResult = await sessionRegistry.updateSession(
    sessionId,
    new AbortSession(sessionId),
  );
  if (updateResult.isError) {
    return handleUpdateSessionError(
      updateResult,
      eventService,
      sessionId,
      config.ISSUER,
    );
  }

  const sessionAttributes = updateResult.value
    .attributes as AuthSessionAbortedAttributes;

  const writeAppEndEventResult = await eventService.writeGenericEvent({
    eventName: "DCMAW_ASYNC_APP_END",
    sub: sessionAttributes.subjectIdentifier,
    sessionId: sessionAttributes.sessionId,
    govukSigninJourneyId: sessionAttributes.govukSigninJourneyId,
    componentId: config.ISSUER,
    getNowInMilliseconds: Date.now,
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

  logger.info(LogMessage.ABORT_SESSION_COMPLETED);
  return notImplementedResponse;
}

async function handleConditionalCheckFailure(
  eventService: IEventService,
  sessionAttributes: SessionAttributes,
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

  const writeEventResult = await eventService.writeGenericEvent({
    eventName: "DCMAW_ASYNC_CRI_4XXERROR",
    sub: sessionAttributes.subjectIdentifier,
    sessionId: sessionAttributes.sessionId,
    govukSigninJourneyId: sessionAttributes.govukSigninJourneyId,
    componentId: issuer,
    getNowInMilliseconds: Date.now,
    redirect_uri: sessionAttributes.redirectUri,
    suspected_fraud_signal: getFraudSignal(isSessionExpired),
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
  issuer: string,
): Promise<APIGatewayProxyResult> {
  const writeEventResult = await eventService.writeGenericEvent({
    eventName: "DCMAW_ASYNC_CRI_4XXERROR",
    sessionId,
    sub: undefined,
    govukSigninJourneyId: undefined,
    componentId: issuer,
    getNowInMilliseconds: Date.now,
    ipAddress: undefined,
    txmaAuditEncoded: undefined,
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
  issuer: string,
): Promise<APIGatewayProxyResult> {
  const writeEventResult = await eventService.writeGenericEvent({
    eventName: "DCMAW_ASYNC_CRI_5XXERROR",
    sessionId,
    sub: undefined,
    govukSigninJourneyId: undefined,
    componentId: issuer,
    getNowInMilliseconds: Date.now,
    ipAddress: undefined,
    txmaAuditEncoded: undefined,
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
  issuer: string,
): Promise<APIGatewayProxyResult> {
  switch (updateSessionResult.value.errorType) {
    case UpdateSessionError.CONDITIONAL_CHECK_FAILURE:
      return handleConditionalCheckFailure(
        eventService,
        updateSessionResult.value.attributes,
        issuer,
      );
    case UpdateSessionError.SESSION_NOT_FOUND:
      return handleSessionNotFound(eventService, sessionId, issuer);
    case UpdateSessionError.INTERNAL_SERVER_ERROR:
      return handleInternalServerError(eventService, sessionId, issuer);
  }
}

export const lambdaHandler = lambdaHandlerConstructor.bind(
  null,
  runtimeDependencies,
);
