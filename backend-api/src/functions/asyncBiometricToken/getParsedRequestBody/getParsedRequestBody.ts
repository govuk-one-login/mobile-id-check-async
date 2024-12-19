import { errorResult, Result, successResult } from "../../utils/result";

export function getParsedRequestBody(
  body: string | null,
): Result<IAsyncBiometricTokenValidParsedRequestBody> {
  if (body == null) {
    return errorResult({
      errorMessage: `Request body is either null or undefined. Request body: ${body}`,
      errorCategory: "CLIENT_ERROR",
    });
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(body);
  } catch (error: unknown) {
    return errorResult({
      errorMessage: `Request body could not be parsed as JSON. ${error}`,
      errorCategory: "CLIENT_ERROR",
    });
  }
  const { sessionId, documentType } = parsedBody;

  if (sessionId == null) {
    return errorResult({
      errorMessage: `sessionId in request body is either null or undefined. sessionId: ${sessionId}`,
      errorCategory: "CLIENT_ERROR",
    });
  }

  if (!isString(sessionId)) {
    return errorResult({
      errorMessage: `sessionId in request body is not of type string. sessionId: ${sessionId}`,
      errorCategory: "CLIENT_ERROR"
    })
  }

  if (sessionId === "") {
    return errorResult({
      errorMessage: `sessionId in request body is an empty string. sessionId: ${sessionId}`,
      errorCategory: "CLIENT_ERROR",
    });
  }

  if (documentType == null) {
    return errorResult({
      errorMessage: `documentType in request body is either null or undefined. documentType: ${documentType}`,
      errorCategory: "CLIENT_ERROR",
    });
  }

  if (!isString(documentType)) {
    return errorResult({
      errorMessage: `documentType in request body is not of type string. documentType: ${documentType}`,
      errorCategory: "CLIENT_ERROR"
    })
  }

  if (documentType === "") {
    return errorResult({
      errorMessage: `documentType in request body is an empty string. documentType: ${documentType}`,
      errorCategory: "CLIENT_ERROR",
    });
  }

  if (!isAllowableDocument(documentType)) {
    return errorResult({
      errorMessage: `documentType in request body is invalid. documentType: ${documentType}`,
      errorCategory: "CLIENT_ERROR",
    });
  }

  return successResult({
    sessionId,
    documentType,
  });
}

function isAllowableDocument(
  documentType: string,
): documentType is DocumentType {
  return (
    documentType === "NFC_PASSPORT" ||
    documentType === "UK_DRIVING_LICENCE" ||
    documentType === "UK_NFC_BRP"
  );
}

function isString(
  field: unknown
): field is string {
  return typeof field === 'string';
}

interface IAsyncBiometricTokenValidParsedRequestBody {
  sessionId: string;
  documentType: DocumentType;
}

type DocumentType = "NFC_PASSPORT" | "UK_DRIVING_LICENCE" | "UK_NFC_BRP";
