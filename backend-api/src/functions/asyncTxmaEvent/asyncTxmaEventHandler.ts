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
import {
  IAsyncTxmaEventDependencies,
  runtimeDependencies,
} from "./handlerDependencies";
import { validateRequestBody } from "./validateRequestBody/validateRequestBody";
import { getTxmaEventConfig } from "./txmaEventConfig";
import { IEventService } from "../services/events/types";
import {
  GetSessionError,
  SessionRetrievalFailed,
} from "../common/session/SessionRegistry";
import { FailureWithValue } from "../utils/result";
import { getIpAddress } from "../common/request/getIpAddress/getIpAddress";
import { getHeader } from "../common/request/getHeader/getHeader";

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
    // const getAttributesResult = getSessionAttributesFromDynamoDbItem(
    //   error.Item,
    //   getSessionAttributesOptions,
    // );
    // if (getAttributesResult.isError) {
    //   return this.handleUpdateSessionInternalServerError(
    //     error,
    //     updateExpressionDataToLog,
    //   );
    // }

    return handleGetSessionError(eventService, {
      getSessionResult,
      ...eventData,
    });
  }

  logger.info(LogMessage.TXMA_EVENT_COMPLETED);

  return notImplementedResponse;
}

export const lambdaHandler = lambdaHandlerConstructor.bind(
  null,
  runtimeDependencies,
);

interface HandleGetSessionErrorData {
  getSessionResult: FailureWithValue<SessionRetrievalFailed>;
  sessionId: string;
  issuer: string;
  ipAddress: string;
  txmaAuditEncoded: string | undefined;
}

async function handleGetSessionError(
  eventService: IEventService,
  data: HandleGetSessionErrorData,
): Promise<APIGatewayProxyResult> {
  const { getSessionResult, sessionId, issuer, ipAddress, txmaAuditEncoded } =
    data;
  switch (getSessionResult.value.errorType) {
    case GetSessionError.SESSION_NOT_FOUND:
      return handleSessionNotFound(eventService, {
        sessionId,
        issuer,
        ipAddress,
        txmaAuditEncoded,
      });
    case GetSessionError.INTERNAL_SERVER_ERROR:
      return handleInternalServerError(eventService, {
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
