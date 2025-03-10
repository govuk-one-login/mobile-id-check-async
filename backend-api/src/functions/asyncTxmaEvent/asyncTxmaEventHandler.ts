import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import {
  badRequestResponse,
  notImplementedResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "../common/lambdaResponses";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { setupLogger } from "../common/logging/setupLogger";
import { getHeader } from "../common/request/getHeader/getHeader";
import { getIpAddress } from "../common/request/getIpAddress/getIpAddress";
import {
  GetSessionError,
  SessionRetrievalFailed,
} from "../common/session/SessionRegistry";
import { IEventService } from "../services/events/types";
import {
  IAsyncTxmaEventDependencies,
  runtimeDependencies,
} from "./handlerDependencies";
import { getTxmaEventConfig } from "./txmaEventConfig";
import { validateRequestBody } from "./validateRequestBody/validateRequestBody";

export async function lambdaHandlerConstructor(
  dependencies: IAsyncTxmaEventDependencies,
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  setupLogger(context);
  logger.info(LogMessage.TXMA_EVENT_STARTED);

  const configResult = getTxmaEventConfig(dependencies.env);
  if (configResult.isError) {
    return serverErrorResponse;
  }
  const config = configResult.value;

  const validateRequestBodyResult = validateRequestBody(event.body);
  if (validateRequestBodyResult.isError) {
    const { errorMessage } = validateRequestBodyResult.value;
    logger.error(LogMessage.TXMA_EVENT_REQUEST_BODY_INVALID, {
      errorMessage,
    });
    return badRequestResponse("invalid_request", errorMessage);
  }
  const { sessionId } = validateRequestBodyResult.value;

  const sessionRegistry = dependencies.getSessionRegistry(
    config.SESSION_TABLE_NAME,
  );
  const getSessionResult = await sessionRegistry.getSession(sessionId);
  const eventService = dependencies.getEventService(config.TXMA_SQS);
  const eventData = {
    sessionId,
    issuer: config.ISSUER,
    ipAddress: getIpAddress(event),
    txmaAuditEncoded: getHeader(event.headers, "Txma-Audit-Encoded"),
  };
  if (getSessionResult.isError) {
    return handleGetSessionError(
      eventService,
      getSessionResult.value,
      eventData,
    );
  }

  logger.info(LogMessage.TXMA_EVENT_COMPLETED);

  return notImplementedResponse;
}

export const lambdaHandler = lambdaHandlerConstructor.bind(
  null,
  runtimeDependencies,
);

interface HandleGetSessionErrorData {
  sessionId: string;
  issuer: string;
  ipAddress: string;
  txmaAuditEncoded: string | undefined;
}

async function handleGetSessionError(
  eventService: IEventService,
  getSessionResult: SessionRetrievalFailed,
  data: HandleGetSessionErrorData,
): Promise<APIGatewayProxyResult> {
  const { sessionId, issuer, ipAddress, txmaAuditEncoded } = data;
  switch (getSessionResult.errorType) {
    case GetSessionError.INTERNAL_SERVER_ERROR:
      return handleInternalServerError(eventService, {
        sessionId,
        issuer,
        ipAddress,
        txmaAuditEncoded,
      });
    case GetSessionError.SESSION_NOT_FOUND:
      return handleSessionNotFound(eventService, {
        sessionId,
        issuer,
        ipAddress,
        txmaAuditEncoded,
      });
  }
}

interface HandleSessionNotFoundData {
  sessionId: string;
  issuer: string;
  ipAddress: string;
  txmaAuditEncoded: string | undefined;
}

async function handleSessionNotFound(
  eventService: IEventService,
  data: HandleSessionNotFoundData,
): Promise<APIGatewayProxyResult> {
  const { sessionId, issuer, ipAddress, txmaAuditEncoded } = data;
  const writeEventResult = await eventService.writeGenericEvent({
    eventName: "DCMAW_ASYNC_CRI_4XXERROR",
    sub: undefined,
    sessionId,
    govukSigninJourneyId: undefined,
    getNowInMilliseconds: Date.now,
    componentId: issuer,
    ipAddress,
    txmaAuditEncoded,
    redirect_uri: undefined,
    suspected_fraud_signal: undefined,
  });

  if (writeEventResult.isError) {
    logger.error(LogMessage.ERROR_WRITING_AUDIT_EVENT, {
      data: {
        auditEventName: "DCMAW_ASYNC_CRI_4XXERROR",
      },
    });
    return serverErrorResponse;
  }
  return unauthorizedResponse("invalid_session", "Session not found");
}

interface HandleInternalServerErrorData {
  sessionId: string;
  issuer: string;
  ipAddress: string;
  txmaAuditEncoded: string | undefined;
}

async function handleInternalServerError(
  eventService: IEventService,
  data: HandleInternalServerErrorData,
): Promise<APIGatewayProxyResult> {
  const { sessionId, issuer, ipAddress, txmaAuditEncoded } = data;
  const writeEventResult = await eventService.writeGenericEvent({
    eventName: "DCMAW_ASYNC_CRI_5XXERROR",
    sub: undefined,
    sessionId,
    govukSigninJourneyId: undefined,
    getNowInMilliseconds: Date.now,
    componentId: issuer,
    ipAddress,
    txmaAuditEncoded,
    redirect_uri: undefined,
    suspected_fraud_signal: undefined,
  });

  if (writeEventResult.isError) {
    logger.error(LogMessage.ERROR_WRITING_AUDIT_EVENT, {
      data: {
        auditEventName: "DCMAW_ASYNC_CRI_5XXERROR",
      },
    });
  }
  return serverErrorResponse;
}
