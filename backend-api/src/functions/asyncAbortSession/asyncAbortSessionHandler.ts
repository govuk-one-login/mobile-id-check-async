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
import { handleUpdateSessionError } from "../common/handlers/errorHandlers";

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

  logger.info(LogMessage.ABORT_SESSION_COMPLETED);
  return notImplementedResponse;
}

export const lambdaHandler = lambdaHandlerConstructor.bind(
  null,
  runtimeDependencies,
);
