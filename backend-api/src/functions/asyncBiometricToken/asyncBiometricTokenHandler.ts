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
import { emptyFailure, Result, successResult } from "../utils/result";
import { DocumentType } from "../types/document";
import { BiometricTokenIssued } from "../common/session/updateOperations/BiometricTokenIssued/BiometricTokenIssued";
import { UpdateSessionError } from "../common/session/SessionRegistry";
import { randomUUID } from "crypto";

export async function lambdaHandlerConstructor(
  dependencies: IAsyncBiometricTokenDependencies,
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  logger.resetKeys();
  logger.addContext(context);
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

  const submitterKeyResult = await getSubmitterKeyForDocumentType(
    documentType,
    config,
    dependencies.getSecrets,
  );
  if (submitterKeyResult.isError) {
    return serverErrorResponse;
  }
  const submitterKey = submitterKeyResult.value;

  const biometricTokenResult = await dependencies.getBiometricToken(
    config.READID_BASE_URL,
    submitterKey,
  );
  if (biometricTokenResult.isError) {
    return serverErrorResponse;
  }

  const opaqueId = generateOpaqueId();
  const sessionRegistry = dependencies.getSessionRegistry(
    config.SESSION_TABLE_NAME,
  );

  const eventService = await dependencies.eventService(config.TXMA_SQS);
  const updateSessionResult = await sessionRegistry.updateSession(
    sessionId,
    new BiometricTokenIssued(documentType, opaqueId),
  );
  if (updateSessionResult.isError) {
    let writeEventResult;
    switch (updateSessionResult.value) {
      case UpdateSessionError.CONDITIONAL_CHECK_FAILURE:
        writeEventResult = await eventService.writeCriErrorEvent({
          eventName: "DCMAW_ASYNC_CRI_4XXERROR",
          sub: "mockSub",
          sessionId,
          govukSigninJourneyId: "mockGovukSigninJourneyId",
          getNowInMilliseconds: Date.now,
          componentId: config.ISSUER,
        });

        if (writeEventResult.isError) {
          logger.error("ERROR_WRITING_AUDIT_EVENT", {
            errorMessage:
              "Unexpected error writing the DCMAW_ASYNC_CRI_4XXERROR event",
          });
          return serverErrorResponse;
        }
        return unauthorizedResponse(
          "invalid_session",
          "User session is not in a valid state for this operation.",
        );
      case UpdateSessionError.INTERNAL_SERVER_ERROR:
        return serverErrorResponse;
    }
  }

  logger.info(LogMessage.BIOMETRIC_TOKEN_COMPLETED);
  return okResponse({
    accessToken: biometricTokenResult.value,
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
