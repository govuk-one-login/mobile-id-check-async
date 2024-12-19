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
import { getParsedRequestBody } from "./getParsedRequestBody/getParsedRequestBody";

export async function lambdaHandlerConstructor(
  dependencies: IAsyncBiometricTokenDependencies,
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  const logger = dependencies.logger();
  logger.addContext(context);
  logger.log("STARTED");

  const parsedRequestBodyOrError = getParsedRequestBody(event.body);
  if (parsedRequestBodyOrError.isError) {
    const errorMessage = parsedRequestBodyOrError.value.errorMessage;

    logger.log("REQUEST_BODY_INVALID", {
      errorMessage,
    });
    return badRequestResponse("invalid_request", "Request body invalid");
  }
  // const { sessionId, documentType } = parsedRequestBodyOrError.value

  logger.log("COMPLETED");
  return notImplementedResponse;
}

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
