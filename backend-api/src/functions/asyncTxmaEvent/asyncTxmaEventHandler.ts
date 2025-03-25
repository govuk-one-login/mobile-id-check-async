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
import { GetSessionBiometricTokenIssued } from "../common/session/getOperations/TxmaEvent/GetSessionBiometricTokenIssued";
import { SessionAttributes } from "../common/session/session";
import {
  GetSessionError,
  GetSessionFailed,
} from "../common/session/SessionRegistry";
import { IEventService } from "../services/events/types";
import { emptySuccess, errorResult, Result } from "../utils/result";
import {
  IAsyncTxmaEventDependencies,
  runtimeDependencies,
} from "./handlerDependencies";
import { getTxmaEventConfig } from "./txmaEventConfig";
import {
  IAsyncTxmaEventRequestBody,
  validateRequestBody,
} from "./validateRequestBody/validateRequestBody";

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
  const requestBody = validateRequestBodyResult.value;

  const sessionRegistry = dependencies.getSessionRegistry(
    config.SESSION_TABLE_NAME,
  );
  const getSessionResult = await sessionRegistry.getSession(
    requestBody.sessionId,
    new GetSessionBiometricTokenIssued(),
  );

  if (getSessionResult.isError) {
    return handleGetSessionError({
      errorData: getSessionResult.value,
    });
  }
  const sessionAttributes = getSessionResult.value;

  const eventService = dependencies.getEventService(config.TXMA_SQS);
  const sessionData = { requestBody, sessionAttributes, issuer: config.ISSUER };
  const handleWritingEventResult = await handleWritingEvent({
    eventService,
    event,
    sessionData,
  });
  if (handleWritingEventResult.isError) {
    return handleWritingEventResult.value;
  }

  logger.info(LogMessage.TXMA_EVENT_COMPLETED);
  return notImplementedResponse;
}

export const lambdaHandler = lambdaHandlerConstructor.bind(
  null,
  runtimeDependencies,
);

async function handleGetSessionError({
  errorData,
}: {
  errorData: GetSessionFailed;
}): Promise<APIGatewayProxyResult> {
  if (errorData.errorType === GetSessionError.CLIENT_ERROR) {
    return unauthorizedResponse(
      "invalid_session",
      "Session does not exist or in incorrect state",
    );
  }

  return serverErrorResponse;
}

interface HandleWritingEventInput {
  eventService: IEventService;
  event: APIGatewayProxyEvent;
  sessionData: {
    requestBody: IAsyncTxmaEventRequestBody;
    sessionAttributes: SessionAttributes;
    issuer: string;
  };
}

async function handleWritingEvent({
  eventService,
  event,
  sessionData,
}: HandleWritingEventInput): Promise<Result<void, APIGatewayProxyResult>> {
  const { ipAddress, txmaAuditEncoded } = getAuditData(event);
  const { requestBody, sessionAttributes, issuer } = sessionData;
  const { sessionId, eventName } = requestBody;
  const { subjectIdentifier, govukSigninJourneyId, redirectUri } =
    sessionAttributes;
  const writeEventResult = await eventService.writeTxmaBillingEvent({
    event_name: eventName,
    sub: subjectIdentifier,
    sessionId,
    govukSigninJourneyId,
    getNowInMilliseconds: Date.now,
    componentId: issuer,
    ipAddress,
    txmaAuditEncoded,
    redirect_uri: redirectUri,
  });

  if (writeEventResult.isError) {
    logger.error(LogMessage.ERROR_WRITING_AUDIT_EVENT, {
      data: {
        auditEventName: eventName,
      },
    });
    return errorResult(serverErrorResponse);
  }

  return emptySuccess();
}
