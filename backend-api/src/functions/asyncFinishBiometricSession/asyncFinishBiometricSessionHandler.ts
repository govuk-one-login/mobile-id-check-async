import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import {
  badRequestResponse,
  forbiddenResponse,
  notImplementedResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "../common/lambdaResponses";
import {
  IAsyncFinishBiometricSessionDependencies,
  runtimeDependencies,
} from "./handlerDependencies";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { validateRequestBody } from "./validateRequestBody/validateRequestBody";
import { UpdateSessionError } from "../common/session/SessionRegistry";
import { BiometricSessionFinished } from "../common/session/updateOperations/BiometricSessionFinished/BiometricSessionFinished";
import { getFinishBiometricSessionConfig } from "./finishBiometricSessionConfig";

export async function lambdaHandlerConstructor(
  dependencies: IAsyncFinishBiometricSessionDependencies,
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  logger.resetKeys();
  logger.addContext(context);
  logger.info(LogMessage.FINISH_BIOMETRIC_SESSION_STARTED);

  const configResult = getFinishBiometricSessionConfig(dependencies.env);
  if (configResult.isError) {
    return serverErrorResponse;
  }
  const config = configResult.value;

  const validateRequestBodyResult = validateRequestBody(event.body);
  if (validateRequestBodyResult.isError) {
    const errorMessage = validateRequestBodyResult.value.errorMessage;
    logger.error(LogMessage.FINISH_BIOMETRIC_SESSION_REQUEST_BODY_INVALID, {
      errorMessage,
    });
    return badRequestResponse("invalid_request", errorMessage);
  }

  const { sessionId, biometricSessionId } = validateRequestBodyResult.value;
  const eventService = dependencies.getEventService(config.TXMA_SQS);
  const sessionRegistry = dependencies.getSessionRegistry(
    config.SESSION_TABLE_NAME,
  );

  const updateSessionResult = await sessionRegistry.updateSession(
    sessionId,
    new BiometricSessionFinished(biometricSessionId),
  );

  if (updateSessionResult.isError) {
    const error = updateSessionResult.value;

    switch (error.errorType) {
      case UpdateSessionError.SESSION_NOT_FOUND: {
        const writeEventResult =
          await eventService.writeBiometricSessionFinishedEvent({
            eventName: "DCMAW_ASYNC_CRI_4XXERROR",
            sessionId,
            sub: undefined,
            govukSigninJourneyId: undefined,
            componentId: config.ISSUER,
            getNowInMilliseconds: Date.now,
            transactionId: biometricSessionId,
            extensions: {
              suspected_fraud_signal: "AUTH_SESSION_NOT_FOUND",
            },
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

      case UpdateSessionError.CONDITIONAL_CHECK_FAILURE: {
        const sessionAttributes = error.attributes;
        if (!sessionAttributes) {
          const writeEventResult =
            await eventService.writeBiometricSessionFinishedEvent({
              eventName: "DCMAW_ASYNC_CRI_4XXERROR",
              sessionId,
              sub: undefined,
              govukSigninJourneyId: undefined,
              componentId: config.ISSUER,
              getNowInMilliseconds: Date.now,
              transactionId: biometricSessionId,
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

        const sessionAge = Date.now() - sessionAttributes.createdAt;
        if (sessionAge > 60 * 60 * 1000) {
          const writeEventResult =
            await eventService.writeBiometricSessionFinishedEvent({
              eventName: "DCMAW_ASYNC_CRI_4XXERROR",
              sub: sessionAttributes.subjectIdentifier,
              sessionId: sessionAttributes.sessionId,
              govukSigninJourneyId: sessionAttributes.govukSigninJourneyId,
              componentId: config.ISSUER,
              getNowInMilliseconds: Date.now,
              transactionId: biometricSessionId,
              extensions: {
                suspected_fraud_signal: "AUTH_SESSION_TOO_OLD",
              },
            });

          if (writeEventResult.isError) {
            logger.error(LogMessage.ERROR_WRITING_AUDIT_EVENT, {
              data: {
                auditEventName: "DCMAW_ASYNC_CRI_4XXERROR",
              },
            });
            return serverErrorResponse;
          }

          return forbiddenResponse("expired_session", "Session has expired");
        }

        const writeEventResult =
          await eventService.writeBiometricSessionFinishedEvent({
            eventName: "DCMAW_ASYNC_CRI_4XXERROR",
            sub: sessionAttributes.subjectIdentifier,
            sessionId: sessionAttributes.sessionId,
            govukSigninJourneyId: sessionAttributes.govukSigninJourneyId,
            componentId: config.ISSUER,
            getNowInMilliseconds: Date.now,
            transactionId: biometricSessionId,
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
          "Session in invalid state",
        );
      }

      case UpdateSessionError.INTERNAL_SERVER_ERROR:
      default: {
        const writeEventResult =
          await eventService.writeBiometricSessionFinishedEvent({
            eventName: "DCMAW_ASYNC_CRI_5XXERROR",
            sessionId,
            sub: undefined,
            govukSigninJourneyId: undefined,
            componentId: config.ISSUER,
            getNowInMilliseconds: Date.now,
            transactionId: biometricSessionId,
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
    }
  }

  logger.info(LogMessage.FINISH_BIOMETRIC_SESSION_COMPLETED);
  return notImplementedResponse;
}

export const lambdaHandler = lambdaHandlerConstructor.bind(
  null,
  runtimeDependencies,
);
