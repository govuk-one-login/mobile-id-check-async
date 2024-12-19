import { errorResult, Result, successResult } from "../../utils/result"

export function getParsedRequestBody (body: string | null): Result<IAsyncBiometricTokenValidParsedRequestBody> {
  if (body == null) {
    return errorResult({
      errorMessage: `Request body is either null or undefined. Request body: ${body}`,
      errorCategory: "CLIENT_ERROR"
    })
  }

  let parsedBody
  try {
    parsedBody = JSON.parse(body)
  } catch (error: unknown) {
    return errorResult({
      errorMessage: `Request body could not be parsed as JSON. ${error}`,
      errorCategory: "CLIENT_ERROR"
    })
  }
  const { sessionId, documentType } = parsedBody

  const sessionIdValidStringOrError = validateStringField(sessionId, "sessionId")
  if (sessionIdValidStringOrError.isError) {
    return sessionIdValidStringOrError
  }

  const documentTypeValidStringOrError = validateStringField(documentType, "documentType")
  if (documentTypeValidStringOrError.isError) {
    return documentTypeValidStringOrError
  }

  if (!isAllowableDocument(documentType)) {
    return errorResult({
      errorMessage: `documentType in request body is invalid. documentType: ${documentType}`,
      errorCategory: "CLIENT_ERROR"
    })
  }

  return successResult({
    sessionId,
    documentType
  })
}

function validateStringField(value: unknown, fieldName: string): Result<null> {
  if (value == null) {
    return errorResult({
      errorMessage: `${fieldName} in request body is either null or undefined. ${fieldName}: ${value}`,
      errorCategory: "CLIENT_ERROR"
    })
  }

  if (typeof value !== 'string') {
    return errorResult({
      errorMessage: `${fieldName} in request body is not of type string. ${fieldName}: ${value}`,
      errorCategory: "CLIENT_ERROR"
    })
  }

  if (value === "") {
    return errorResult({
      errorMessage: `${fieldName} in request body is an empty string. ${fieldName}: ${value}`,
      errorCategory: "CLIENT_ERROR"
    })
  }

  return successResult(null)
}

function isAllowableDocument(documentType: string): documentType is AllowableDocuments {
  return documentType === "NFC_PASSPORT"
  || documentType === "UK_DRIVING_LICENCE"
  || documentType === "UK_NFC_BRP"
}

interface IAsyncBiometricTokenValidParsedRequestBody {
  sessionId: string
  documentType: AllowableDocuments
}

type AllowableDocuments = "NFC_PASSPORT" | "UK_DRIVING_LICENCE" | "UK_NFC_BRP"
