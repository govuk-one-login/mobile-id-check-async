import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import {
  dependencies,
  IAsyncBiometricTokenDependencies,
} from "./handlerDependencies";
import {
  badRequestResponse,
  notImplementedResponse,
} from "../common/lambdaResponses";
import { validateRequestBody } from "./validateRequestBody/validateRequestBody";
import { logger, setupLoggerForNewInvocation } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";

export async function lambdaHandlerConstructor(
  _dependencies: IAsyncBiometricTokenDependencies,
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  setupLoggerForNewInvocation(logger, context);
  logger.info(LogMessage.BIOMETRIC_TOKEN_STARTED);

  const validateRequestBodyResult = validateRequestBody(event.body);
  if (validateRequestBodyResult.isError) {
    const errorMessage = validateRequestBodyResult.value.errorMessage;
    logger.error(LogMessage.BIOMETRIC_TOKEN_REQUEST_BODY_INVALID, {
      errorMessage,
    });
    return badRequestResponse("invalid_request", errorMessage);
  }

  logger.info(LogMessage.BIOMETRIC_TOKEN_COMPLETED);
  return notImplementedResponse;
}

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
