import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import {
  IAsyncBiometricTokenDependencies,
  runtimeDependencies,
} from "./handlerDependencies";
import {
  badRequestResponse,
  okResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "../common/lambdaResponses";
import { validateRequestBody } from "./validateRequestBody/validateRequestBody";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import {
  BiometricTokenConfig,
  getBiometricTokenConfig,
} from "./biometricTokenConfig";
import { GetSecrets } from "../common/config/secrets";
import {
  emptyFailure,
  FailureWithValue,
  Result,
  successResult,
} from "../utils/result";
import { DocumentType } from "../types/document";
import { BiometricTokenIssued } from "../common/session/updateOperations/BiometricTokenIssued/BiometricTokenIssued";
import {
  UpdateSessionError,
  SessionUpdateFailed,
} from "../common/session/SessionRegistry/types";
import { randomUUID } from "crypto";
import { IEventService } from "../services/events/types";
import {
  BaseSessionAttributes,
  BiometricTokenIssuedSessionAttributes,
} from "../common/session/session";
import { setupLogger } from "../common/logging/setupLogger";
import { getAuditData } from "../common/request/getAuditData/getAuditData";
import { appendPersistentIdentifiersToLogger } from "../common/logging/helpers/appendPersistentIdentifiersToLogger";

export async function lambdaHandlerConstructor(
  dependencies: IAsyncBiometricTokenDependencies,
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  setupLogger(context);
  logger.info(LogMessage.BIOMETRIC_TOKEN_STARTED);

  const configResult = getBiometricTokenConfig(dependencies.env);
  if (configResult.isError) {
    return serverErrorResponse;
  }
  const config = configResult.value;

  const validateRequestBodyResult = validateRequestBody(event.body);
  if (validateRequestBodyResult.isError) {
    const errorMessage = validateRequestBodyResult.value.errorMessage;
    logger.error(LogMessage.BIOMETRIC_TOKEN_REQUEST_BODY_INVALID, {
      errorMessage,
    });
    return badRequestResponse("invalid_request", errorMessage);
  }
  const { documentType, sessionId } = validateRequestBodyResult.value;

  appendPersistentIdentifiersToLogger({ sessionId });

  const submitterKeyResult = await getSubmitterKeyForDocumentType(
    documentType,
    config,
    dependencies.getSecrets,
  );
  if (submitterKeyResult.isError) {
    return serverErrorResponse;
  }
  const submitterKey = submitterKeyResult.value;

  const eventService = dependencies.getEventService(config.TXMA_SQS);

  const { ipAddress, txmaAuditEncoded } = getAuditData(event);

  const biometricTokenResult = await dependencies.getBiometricToken(
    config.READID_BASE_URL,
    submitterKey,
  );
  if (biometricTokenResult.isError) {
    return handleInternalServerError(eventService, {
      sessionId,
      issuer: config.ISSUER,
      ipAddress,
      txmaAuditEncoded,
    });
  }

  const opaqueId = generateOpaqueId();
  const sessionRegistry = dependencies.getSessionRegistry(
    config.SESSION_TABLE_NAME,
  );

  const updateSessionResult = await sessionRegistry.updateSession(
    sessionId,
    new BiometricTokenIssued(documentType, opaqueId),
  );

  if (updateSessionResult.isError) {
    return handleUpdateSessionError(eventService, {
      updateSessionResult,
      sessionId,
      issuer: config.ISSUER,
      ipAddress,
      txmaAuditEncoded,
    });
  }

  const sessionAttributes = updateSessionResult.value
    .attributes as BiometricTokenIssuedSessionAttributes;

  appendPersistentIdentifiersToLogger({
    govukSigninJourneyId: sessionAttributes.govukSigninJourneyId,
  });

  const responseBody = {
    accessToken: biometricTokenResult.value,
    opaqueId,
  };

  return await handleOkResponse(eventService, {
    sessionAttributes,
    issuer: config.ISSUER,
    responseBody,
    ipAddress,
    txmaAuditEncoded,
    opaqueId,
  });
}

export const lambdaHandler = lambdaHandlerConstructor.bind(
  null,
  runtimeDependencies,
);

async function getSubmitterKeyForDocumentType(
  documentType: DocumentType,
  config: BiometricTokenConfig,
  getSecrets: GetSecrets,
): Promise<Result<string, void>> {
  const getSubmitterKeysResult = await getSecrets({
    secretNames: [
      config.BIOMETRIC_SUBMITTER_KEY_SECRET_PATH_PASSPORT,
      config.BIOMETRIC_SUBMITTER_KEY_SECRET_PATH_BRP,
      config.BIOMETRIC_SUBMITTER_KEY_SECRET_PATH_DL,
    ],
    cacheDurationInSeconds: Number(
      config.BIOMETRIC_SUBMITTER_KEY_SECRET_CACHE_DURATION_IN_SECONDS,
    ),
  });
  if (getSubmitterKeysResult.isError) {
    return emptyFailure();
  }
  const submitterKeysBySecretName = getSubmitterKeysResult.value;
  switch (documentType) {
    case "NFC_PASSPORT":
      return successResult(
        submitterKeysBySecretName[
          config.BIOMETRIC_SUBMITTER_KEY_SECRET_PATH_PASSPORT
        ],
      );
    case "UK_NFC_BRP":
      return successResult(
        submitterKeysBySecretName[
          config.BIOMETRIC_SUBMITTER_KEY_SECRET_PATH_BRP
        ],
      );
    case "UK_DRIVING_LICENCE":
      return successResult(
        submitterKeysBySecretName[
          config.BIOMETRIC_SUBMITTER_KEY_SECRET_PATH_DL
        ],
      );
  }
}

function generateOpaqueId(): string {
  return randomUUID();
}

interface HandleConditionalCheckFailureData {
  sessionAttributes: BaseSessionAttributes;
  issuer: string;
  ipAddress: string;
  txmaAuditEncoded: string | undefined;
}

async function handleConditionalCheckFailure(
  eventService: IEventService,
  data: HandleConditionalCheckFailureData,
): Promise<APIGatewayProxyResult> {
  const { sessionAttributes, issuer, ipAddress, txmaAuditEncoded } = data;
  const writeEventResult = await eventService.writeGenericEvent({
    eventName: "DCMAW_ASYNC_CRI_4XXERROR",
    sub: sessionAttributes.subjectIdentifier,
    sessionId: sessionAttributes.sessionId,
    govukSigninJourneyId: sessionAttributes.govukSigninJourneyId,
    getNowInMilliseconds: Date.now,
    componentId: issuer,
    ipAddress,
    txmaAuditEncoded,
    redirect_uri: sessionAttributes.redirectUri,
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
  return unauthorizedResponse(
    "invalid_session",
    "User session is not in a valid state for this operation.",
  );
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

interface HandleUpdateSessionErrorData {
  updateSessionResult: FailureWithValue<SessionUpdateFailed>;
  sessionId: string;
  issuer: string;
  ipAddress: string;
  txmaAuditEncoded: string | undefined;
}

async function handleUpdateSessionError(
  eventService: IEventService,
  data: HandleUpdateSessionErrorData,
): Promise<APIGatewayProxyResult> {
  const {
    updateSessionResult,
    sessionId,
    issuer,
    ipAddress,
    txmaAuditEncoded,
  } = data;
  let sessionAttributes;
  switch (updateSessionResult.value.errorType) {
    case UpdateSessionError.CONDITIONAL_CHECK_FAILURE:
      sessionAttributes = updateSessionResult.value.attributes;
      return handleConditionalCheckFailure(eventService, {
        sessionAttributes,
        issuer,
        ipAddress,
        txmaAuditEncoded,
      });
    case UpdateSessionError.SESSION_NOT_FOUND:
      return handleSessionNotFound(eventService, {
        sessionId,
        issuer,
        ipAddress,
        txmaAuditEncoded,
      });
    case UpdateSessionError.INTERNAL_SERVER_ERROR:
      return handleInternalServerError(eventService, {
        sessionId,
        issuer,
        ipAddress,
        txmaAuditEncoded,
      });
  }
}

interface BiometricTokenIssuedOkResponseBody {
  accessToken: string;
  opaqueId: string;
}

interface HandleOkResponseData {
  sessionAttributes: BiometricTokenIssuedSessionAttributes;
  issuer: string;
  responseBody: BiometricTokenIssuedOkResponseBody;
  ipAddress: string;
  txmaAuditEncoded: string | undefined;
  opaqueId: string;
}

async function handleOkResponse(
  eventService: IEventService,
  data: HandleOkResponseData,
): Promise<APIGatewayProxyResult> {
  const {
    sessionAttributes,
    issuer,
    responseBody,
    ipAddress,
    txmaAuditEncoded,
    opaqueId,
  } = data;
  const writeEventResult = await eventService.writeBiometricTokenIssuedEvent({
    sub: sessionAttributes.subjectIdentifier,
    sessionId: sessionAttributes.sessionId,
    govukSigninJourneyId: sessionAttributes.govukSigninJourneyId,
    getNowInMilliseconds: Date.now,
    componentId: issuer,
    documentType: sessionAttributes.documentType,
    ipAddress,
    txmaAuditEncoded,
    redirect_uri: sessionAttributes.redirectUri,
    opaqueId,
  });

  if (writeEventResult.isError) {
    logger.error(LogMessage.ERROR_WRITING_AUDIT_EVENT, {
      data: {
        auditEventName: "DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED",
      },
    });
    return serverErrorResponse;
  }

  logger.info(LogMessage.BIOMETRIC_TOKEN_COMPLETED);
  return okResponse(responseBody);
}
