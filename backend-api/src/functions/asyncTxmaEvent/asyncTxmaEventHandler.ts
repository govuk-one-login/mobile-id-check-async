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
import { TxMAEventGetSessionOperation } from "../common/session/getOperations/TxmaEvent/TxmaEventGetSessionOperation";
import {
  GetSessionError,
  GetSessionFailed,
  GetSessionValidateSessionErrorData,
} from "../common/session/SessionRegistry";
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
  const getSessionResult = await sessionRegistry.getSession(
    sessionId,
    new TxMAEventGetSessionOperation(),
  );
  if (getSessionResult.isError) {
    return handleGetSessionError({
      errorData: getSessionResult.value,
    });
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
  switch (errorData.errorType) {
    case GetSessionError.INTERNAL_SERVER_ERROR:
      return handleInternalServerError();
    case GetSessionError.SESSION_NOT_FOUND:
      return handleSessionNotFound();
    case GetSessionError.SESSION_INVALID:
      return handleSessionInvalid({
        sessionData: errorData.data,
      });
  }
}

async function handleInternalServerError(): Promise<APIGatewayProxyResult> {
  return serverErrorResponse;
}

async function handleSessionNotFound(): Promise<APIGatewayProxyResult> {
  logger.error(LogMessage.TXMA_EVENT_SESSION_NOT_FOUND);

  return unauthorizedResponse(
    "invalid_session",
    "Session does not exist or in incorrect state",
  );
}

async function handleSessionInvalid({
  sessionData,
}: {
  sessionData: GetSessionValidateSessionErrorData;
}): Promise<APIGatewayProxyResult> {
  logger.error(LogMessage.TXMA_EVENT_SESSION_INVALID, {
    data: {
      ...sessionData,
    },
  });

  return unauthorizedResponse(
    "invalid_session",
    "Session does not exist or in incorrect state",
  );
}
