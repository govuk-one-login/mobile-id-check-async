import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import {
  badRequestResponse,
  notImplementedResponse,
} from "../common/lambdaResponses";
import {
  IAsyncFinishBiometricSessionDependencies,
  runtimeDependencies,
} from "./handlerDependencies";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { validateRequestBody } from "./validateRequestBody/validateRequestBody";

export async function lambdaHandlerConstructor(
  dependencies: IAsyncFinishBiometricSessionDependencies,
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  logger.resetKeys();
  logger.addContext(context);
  logger.info(LogMessage.FINISH_BIOMETRIC_SESSION_STARTED);

  const validateRequestBodyResult = validateRequestBody(event.body);
  if (validateRequestBodyResult.isError) {
    const errorMessage = validateRequestBodyResult.value.errorMessage;
    logger.error(LogMessage.FINISH_BIOMETRIC_SESSION_REQUEST_BODY_INVALID, {
      errorMessage,
    });
    return badRequestResponse("invalid_request", errorMessage);
  }

  logger.info(LogMessage.FINISH_BIOMETRIC_SESSION_COMPLETED);
  return notImplementedResponse;
}

export const lambdaHandler = lambdaHandlerConstructor.bind(
  null,
  runtimeDependencies,
);
