import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import {
  badRequestResponse,
  notImplementedResponse,
  serverErrorResponse,
} from "../common/lambdaResponses";
import {
  IAsyncAbortSessionDependencies,
  runtimeDependencies,
} from "./handlerDependencies";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { validateRequestBody } from "./validateRequestBody/validateRequestBody";
import { AbortSession } from "../common/session/updateOperations/AbortSession/AbortSession";
import { getAbortSessionConfig } from "./abortSessionConfig";
import { setupLogger } from "../common/logging/setupLogger";
import { getAuditData } from "../common/request/getAuditData/getAuditData";
import { handleUpdateSessionError } from "../common/errors/errorHandlers";
import { AuthSessionAbortedAttributes } from "../common/session/session";
import { GenericEventConfig, IEventService } from "../services/events/types";

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

  const updateSessionResult = await sessionRegistry.updateSession(
    sessionId,
    new AbortSession(sessionId),
  );
  if (updateSessionResult.isError) {
    return handleUpdateSessionError({
      updateSessionResult,
      eventService,
      sessionId,
      issuer: config.ISSUER,
      ipAddress,
      txmaAuditEncoded,
    });
  }

  const sessionAttributes = updateSessionResult.value
    .attributes as AuthSessionAbortedAttributes;

  const ipvCoreOutboundMessage = {
    sub: sessionAttributes.subjectIdentifier,
    state: sessionAttributes.clientState,
    error: "access_denied",
    error_description: "User aborted the session",
  };

  const sendMessageToIPVCoreOutboundQueueResult =
    await dependencies.sendMessageToSqs(
      config.IPVCORE_OUTBOUND_SQS,
      ipvCoreOutboundMessage,
    );
  if (sendMessageToIPVCoreOutboundQueueResult.isError) {
    return await handleSendMessageToIPVCoreOutboundQueueFailure({
      eventService,
      sessionAttributes,
      issuer: config.ISSUER,
      ipAddress,
      txmaAuditEncoded,
    });
  }

  const eventMessage: GenericEventConfig = {
    eventName: "DCMAW_ASYNC_ABORT_APP",
    sub: sessionAttributes.subjectIdentifier,
    sessionId: sessionAttributes.sessionId,
    govukSigninJourneyId: sessionAttributes.govukSigninJourneyId,
    componentId: config.ISSUER,
    getNowInMilliseconds: Date.now,
    redirect_uri: sessionAttributes.redirectUri,
    suspected_fraud_signal: undefined,
    ipAddress,
    txmaAuditEncoded,
  };

  const writeAbortAppEventResult =
    await eventService.writeGenericEvent(eventMessage);
  if (writeAbortAppEventResult.isError) {
    logger.error(LogMessage.ERROR_WRITING_AUDIT_EVENT, {
      data: {
        auditEventName: "DCMAW_ASYNC_ABORT_APP",
      },
    });
    return serverErrorResponse;
  }

  logger.info(LogMessage.ABORT_SESSION_COMPLETED);
  return notImplementedResponse;
}

interface HandleSendMessageToIPVCoreOutboundQueueFailureData {
  eventService: IEventService;
  sessionAttributes: AuthSessionAbortedAttributes;
  issuer: string;
  ipAddress: string;
  txmaAuditEncoded: string | undefined;
}

const handleSendMessageToIPVCoreOutboundQueueFailure = async (
  options: HandleSendMessageToIPVCoreOutboundQueueFailureData,
): Promise<APIGatewayProxyResult> => {
  const {
    eventService,
    issuer,
    ipAddress,
    sessionAttributes,
    txmaAuditEncoded,
  } = options;
  const { subjectIdentifier, sessionId, govukSigninJourneyId } =
    sessionAttributes;

  const writeEventResult = await eventService.writeGenericEvent({
    eventName: "DCMAW_ASYNC_CRI_5XXERROR",
    sub: subjectIdentifier,
    sessionId,
    govukSigninJourneyId,
    componentId: issuer,
    getNowInMilliseconds: Date.now,
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
