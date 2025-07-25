import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { RequestService } from "./requestService/requestService";
import {
  dependencies,
  IAsyncActiveSessionDependencies,
} from "./handlerDependencies";
import { ErrorCategory } from "../utils/result";
import { setupLogger } from "../common/logging/setupLogger";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { getActiveSessionConfig } from "./getActiveSessionConfig";
import { appendPersistentIdentifiersToLogger } from "../common/logging/helpers/appendPersistentIdentifiersToLogger";
import {
  AuditData,
  getAuditData,
} from "../common/request/getAuditData/getAuditData";
import { Session } from "../services/session/types";
import { IEventService } from "../services/events/types";

export async function lambdaHandlerConstructor(
  dependencies: IAsyncActiveSessionDependencies,
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  setupLogger(context);
  logger.info(LogMessage.ACTIVE_SESSION_STARTED);

  const configResult = getActiveSessionConfig(dependencies.env);
  if (configResult.isError) {
    return serverErrorResponse;
  }
  const config = configResult.value;
  const eventService = dependencies.eventService(config.TXMA_SQS);

  const authorizationHeaderResult = new RequestService().getAuthorizationHeader(
    event.headers["Authorization"] ?? event.headers["authorization"],
  );
  if (authorizationHeaderResult.isError) {
    logger.error(LogMessage.ACTIVE_SESSION_AUTHORIZATION_HEADER_INVALID, {
      errorMessage: authorizationHeaderResult.value.errorMessage,
    });
    return unauthorizedResponse;
  }
  const serviceTokenJwe = authorizationHeaderResult.value;

  const decryptResult = await dependencies
    .jweDecrypter(config.ENCRYPTION_KEY_ARN)
    .decrypt(serviceTokenJwe);
  if (decryptResult.isError) {
    logger.error(LogMessage.ACTIVE_SESSION_JWE_DECRYPTION_ERROR, {
      errorMessage: decryptResult.value.errorMessage,
    });
    if (decryptResult.value.errorCategory === ErrorCategory.CLIENT_ERROR) {
      return badRequestResponse("Failed to decrypt service token");
    }
    return serverErrorResponse;
  }
  const serviceTokenJwt = decryptResult.value;

  const tokenService = dependencies.tokenService();
  const validateServiceTokenResult = await tokenService.validateServiceToken(
    serviceTokenJwt,
    config.AUDIENCE,
    config.STS_BASE_URL,
  );
  if (validateServiceTokenResult.isError) {
    logger.error(LogMessage.ACTIVE_SESSION_SERVICE_TOKEN_VALIDATION_ERROR, {
      errorMessage: validateServiceTokenResult.value.errorMessage,
    });
    if (
      validateServiceTokenResult.value.errorCategory ===
      ErrorCategory.CLIENT_ERROR
    ) {
      return badRequestResponse("Failed to validate service token");
    }
    return serverErrorResponse;
  }
  const sub = validateServiceTokenResult.value;

  const sessionService = dependencies.sessionService(config.SESSION_TABLE_NAME);
  const getActiveSessionResult = await sessionService.getActiveSession(sub);
  if (getActiveSessionResult.isError) {
    logger.error(LogMessage.GET_ACTIVE_SESSION_FAILURE, {
      errorMessage: getActiveSessionResult.value.errorMessage,
    });
    return serverErrorResponse;
  }
  const session = getActiveSessionResult.value;
  if (session === null) {
    logger.info(LogMessage.ACTIVE_SESSION_ACTIVE_SESSION_NOT_FOUND);
    logger.info(LogMessage.ACTIVE_SESSION_COMPLETED, {
      activeSessionFound: false,
    });
    return notFoundResponse;
  }

  appendPersistentIdentifiersToLogger({ sessionId: session.sessionId });

  return await handleOkResponse(eventService, {
    session,
    auditData: getAuditData(event),
    sub,
    issuer: config.ISSUER,
  });
}

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);

const serverErrorResponse: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 500,
  body: JSON.stringify({
    error: "server_error",
    error_description: "Server Error",
  }),
};

const unauthorizedResponse: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 401,
  body: JSON.stringify({
    error: "unauthorized",
    error_description: "Invalid authorization header",
  }),
};

const badRequestResponse = (
  errorDescription: string,
): APIGatewayProxyResult => {
  return {
    headers: { "Content-Type": "application/json" },
    statusCode: 400,
    body: JSON.stringify({
      error: "invalid_request",
      error_description: errorDescription,
    }),
  };
};

const notFoundResponse: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 404,
  body: JSON.stringify({
    error: "session_not_found",
    error_description: "No active session found for the given sub identifier",
  }),
};

interface HandleOkResponseData {
  session: Session;
  auditData: AuditData;
  sub: string;
  issuer: string;
}

async function handleOkResponse(
  eventService: IEventService,
  { session, auditData, sub, issuer }: HandleOkResponseData,
) {
  const { ipAddress, txmaAuditEncoded } = auditData;
  const { govukSigninJourneyId, redirectUri, sessionId, state } = session;
  const eventName = "DCMAW_ASYNC_CRI_APP_START";

  const writeEventResult = await eventService.writeGenericEvent({
    eventName,
    sub,
    sessionId,
    govukSigninJourneyId,
    getNowInMilliseconds: Date.now,
    componentId: issuer,
    ipAddress,
    txmaAuditEncoded,
    redirect_uri: redirectUri,
    suspected_fraud_signal: undefined,
  });
  if (writeEventResult.isError) {
    logger.error(LogMessage.ERROR_WRITING_AUDIT_EVENT, {
      data: {
        auditEventName: eventName,
      },
    });

    return serverErrorResponse;
  }

  logger.info(LogMessage.ACTIVE_SESSION_COMPLETED, {
    activeSessionFound: true,
  });

  return {
    headers: { "Content-Type": "application/json" },
    statusCode: 200,
    body: JSON.stringify({
      sessionId,
      redirectUri,
      state,
    }),
  };
}
