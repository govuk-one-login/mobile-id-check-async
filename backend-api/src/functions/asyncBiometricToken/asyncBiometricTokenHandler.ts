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

export async function lambdaHandlerConstructor(
  dependencies: IAsyncBiometricTokenDependencies,
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  const logger = dependencies.logger();
  logger.addContext(context);
  logger.log("STARTED");

  const validateRequestBodyResult = validateRequestBody(event.body);
  if (validateRequestBodyResult.isError) {
    const errorMessage = validateRequestBodyResult.value.errorMessage;
    logger.log("BIOMETRIC_TOKEN_REQUEST_BODY_INVALID", {
      errorMessage,
    });
    return badRequestResponse("invalid_request", errorMessage);
  }

  logger.log("COMPLETED");
  return notImplementedResponse;
}

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
