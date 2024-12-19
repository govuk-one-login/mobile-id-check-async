import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import {
  dependencies,
  IAsyncBiometricTokenDependencies,
} from "./handlerDependencies";
import { badRequestResponse, notImplementedResponse } from "../common/lambdaResponses";
import { errorResult, Result, successResult } from "../utils/result";

export async function lambdaHandlerConstructor(
  dependencies: IAsyncBiometricTokenDependencies,
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  const logger = dependencies.logger();
  logger.addContext(context);
  logger.log("STARTED");

  const validRequestBodyOrError = validateRequestBody(event.body)

  if (validRequestBodyOrError.isError) {
    const errorMessage = validRequestBodyOrError.value.errorMessage

    logger.log("REQUEST_BODY_INVALID", {
      errorMessage
    })
    return badRequestResponse(
      "invalid_request",
      errorMessage
    )
  }

  logger.log("COMPLETED");
  return notImplementedResponse;
}

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);

function validateRequestBody (body: string | null): Result<null> {
  if (body == null) {
    return errorResult({
      errorMessage: "Request body is either null or undefined",
      errorCategory: "CLIENT_ERROR"
    })
  }

  return successResult(null)
}