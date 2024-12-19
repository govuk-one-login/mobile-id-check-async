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

  const parsedRequestBodyOrError = getValidParsedRequestBody(event.body)
  if (parsedRequestBodyOrError.isError) {
    const errorMessage = parsedRequestBodyOrError.value.errorMessage

    logger.log("REQUEST_BODY_INVALID", {
      errorMessage
    })
    return badRequestResponse(
      "invalid_request",
      errorMessage
    )
  }
  // const { sessionId, documentType } = parsedRequestBodyOrError.value

  logger.log("COMPLETED");
  return notImplementedResponse;
}

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);

function getValidParsedRequestBody (body: string | null): Result<IAsyncBiometricTokenValidParsedRequestBody> {
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
  const { sessionId, documentType } = parsedBody

  if (sessionId == null) {
    return errorResult({
      errorMessage: "sessionId in request body is either null or undefined",
      errorCategory: "CLIENT_ERROR"
    })
  }

  if (typeof sessionId !== 'string') {
    return errorResult({
      errorMessage: "sessionId in request body is not of type string",
      errorCategory: "CLIENT_ERROR"
    })
  }

  if (sessionId === "") {
    return errorResult({
      errorMessage: "sessionId in request body is an empty string",
      errorCategory: "CLIENT_ERROR"
    })
  }

  if (documentType == null) {
    return errorResult({
      errorMessage: "documentType in request body is either null or undefined",
      errorCategory: "CLIENT_ERROR"
    })
  }

  if (typeof documentType !== 'string') {
    return errorResult({
      errorMessage: "documentType in request body is not of type string",
      errorCategory: "CLIENT_ERROR"
    })
  }

  if (documentType === "") {
    return errorResult({
      errorMessage: "documentType in request body is an empty string",
      errorCategory: "CLIENT_ERROR"
    })
  }

  if (!isAllowableDocument(documentType)) {
    return errorResult({
      errorMessage: "documentType in request body is invalid",
      errorCategory: "CLIENT_ERROR"
    })
  }

  return successResult({
    sessionId,
    documentType
  })
}

interface IAsyncBiometricTokenValidParsedRequestBody {
  sessionId: string
  documentType: AllowableDocuments
}

type AllowableDocuments = "NFC_PASSPORT" | "UK_DRIVING_LICENCE" | "UK_NFC_BRP"

function isAllowableDocument(documentType: string): documentType is AllowableDocuments {
  return documentType === "NFC_PASSPORT"
  || documentType === "UK_DRIVING_LICENCE"
  || documentType === "UK_NFC_BRP"
}