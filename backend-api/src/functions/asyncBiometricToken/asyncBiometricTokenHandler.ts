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

  let parsedBody
  try {
    parsedBody = JSON.parse(body)
  } catch {
    return errorResult({
      errorMessage: "Request body could not be parsed as JSON",
      errorCategory: "CLIENT_ERROR"
    })
  }

  if (parsedBody.sessionId == null) {
    return errorResult({
      errorMessage: "sessionId in request body is either null or undefined",
      errorCategory: "CLIENT_ERROR"
    })
  }

  if (typeof parsedBody.sessionId !== 'string') {
    return errorResult({
      errorMessage: "sessionId in request body is not of type string",
      errorCategory: "CLIENT_ERROR"
    })
  }

  if (parsedBody.sessionId === "") {
    return errorResult({
      errorMessage: "sessionId in request body is an empty string",
      errorCategory: "CLIENT_ERROR"
    })
  }

  if (parsedBody.documentType == null) {
    return errorResult({
      errorMessage: "documentType in request body is either null or undefined",
      errorCategory: "CLIENT_ERROR"
    })
  }

  if (typeof parsedBody.documentType !== 'string') {
    return errorResult({
      errorMessage: "documentType in request body is not of type string",
      errorCategory: "CLIENT_ERROR"
    })
  }

  if (parsedBody.documentType === "") {
    return errorResult({
      errorMessage: "documentType in request body is an empty string",
      errorCategory: "CLIENT_ERROR"
    })
  }

  const allowedDocumentTypes = [
    "NFC_PASSPORT",
    "UK_DRIVING_LICENCE",
    "UK_NFC_BRP"
  ]

  if (!allowedDocumentTypes.includes(parsedBody.documentType)) {
    return errorResult({
      errorMessage: "documentType in request body is invalid",
      errorCategory: "CLIENT_ERROR"
    })
  }

  return successResult(null)
}