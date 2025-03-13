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
import { getAuditData } from "../common/request/getAuditData/getAuditData";
import { TxMAEvent } from "../common/session/getOperations/TxmaEvent/TxMAEvent";
import { SessionAttributes, SessionState } from "../common/session/session";
import {
  GetSessionError,
  SessionRetrievalFailed,
} from "../common/session/SessionRegistry";
import { GenericEventNames, IEventService } from "../services/events/types";
import { Result } from "../utils/result";
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
  const eventService = dependencies.getEventService(config.TXMA_SQS);

  const sessionRegistry = dependencies.getSessionRegistry(
    config.SESSION_TABLE_NAME,
  );
  const getSessionResult = await sessionRegistry.getSession(
    sessionId,
    new TxMAEvent(),
  );
  const { ipAddress, txmaAuditEncoded } = getAuditData(event);
  const eventData = {
    sessionId,
    issuer: config.ISSUER,
    ipAddress,
    txmaAuditEncoded,
  };
  if (getSessionResult.isError) {
    return handleGetSessionError(
      eventService,
      getSessionResult.value,
      eventData,
    );
  }
  const sessionAttributes = getSessionResult.value;

  const isSessionValid = validateSession(sessionAttributes);
  if (!isSessionValid) return handleSessionNotFound(eventService, eventData);

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
  switch (getSessionResult.errorType) {
    case GetSessionError.INTERNAL_SERVER_ERROR:
      return handleInternalServerError(eventService, data);
    case GetSessionError.SESSION_NOT_FOUND:
      return handleSessionNotFound(eventService, data);
  }
}

interface BaseErrorData {
  sessionId: string;
  issuer: string;
  ipAddress: string;
  txmaAuditEncoded: string | undefined;
}

async function handleInternalServerError(
  eventService: IEventService,
  data: BaseErrorData,
): Promise<APIGatewayProxyResult> {
  const writeEventResult = await writeEvent({
    eventService,
    eventName: "DCMAW_ASYNC_CRI_5XXERROR",
    data,
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

async function handleSessionNotFound(
  eventService: IEventService,
  data: BaseErrorData,
): Promise<APIGatewayProxyResult> {
  const writeEventResult = await writeEvent({
    eventService,
    eventName: "DCMAW_ASYNC_CRI_4XXERROR",
    data,
  });

  if (writeEventResult.isError) {
    logger.error(LogMessage.ERROR_WRITING_AUDIT_EVENT, {
      data: {
        auditEventName: "DCMAW_ASYNC_CRI_4XXERROR",
      },
    });
    return serverErrorResponse;
  }
  return unauthorizedResponse(
    "invalid_session",
    "Session does not exist or in incorrect state",
  );
}

async function writeEvent({
  eventService,
  eventName,
  data,
}: {
  eventService: IEventService;
  eventName: GenericEventNames;
  data: BaseErrorData;
}): Promise<Result<void, void>> {
  const { sessionId, issuer, ipAddress, txmaAuditEncoded } = data;
  return await eventService.writeGenericEvent({
    eventName,
    sessionId,
    componentId: issuer,
    ipAddress,
    txmaAuditEncoded,
    sub: undefined,
    govukSigninJourneyId: undefined,
    getNowInMilliseconds: Date.now,
    redirect_uri: undefined,
    suspected_fraud_signal: undefined,
  });
}

function validateSession(sessionAttributes: SessionAttributes): boolean {
  const { sessionState, createdAt } = sessionAttributes;
  if (sessionState !== SessionState.BIOMETRIC_TOKEN_ISSUED) return false;
  if (isOlderThan60minutes(createdAt)) return false;

  return true;
}

function isOlderThan60minutes(createdAtInMilliseconds: number) {
  const SIXTY_MINUTES_IN_MILLISECONDS = 3600000;
  const validFrom = Date.now() - SIXTY_MINUTES_IN_MILLISECONDS;

  return createdAtInMilliseconds < validFrom;
}
