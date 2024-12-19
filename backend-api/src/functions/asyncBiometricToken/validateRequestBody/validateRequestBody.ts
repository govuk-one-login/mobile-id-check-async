import { errorResult, Result, successResult } from "../../utils/result";

export function validateRequestBody(
  body: string | null,
): Result<IAsyncBiometricTokenValidParsedRequestBody> {
  if (body == null) {
    return errorResult({
      errorMessage: `Request body is either null or undefined.`,
    });
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(body);
  } catch (error: unknown) {
    return errorResult({
      errorMessage: `Request body could not be parsed as JSON. ${error}`,
    });
  }
  const { sessionId, documentType } = parsedBody;

  if (sessionId == null) {
    return errorResult({
      errorMessage: `sessionId in request body is either null or undefined.`,
    });
  }

  if (!isString(sessionId)) {
    return errorResult({
      errorMessage: `sessionId in request body is not of type string. sessionId: ${sessionId}`,
    });
  }

  if (sessionId === "") {
    return errorResult({
      errorMessage: `sessionId in request body is an empty string.`,
    });
  }

  if (documentType == null) {
    return errorResult({
      errorMessage: `documentType in request body is either null or undefined.`,
    });
  }

  if (!isString(documentType)) {
    return errorResult({
      errorMessage: `documentType in request body is not of type string. documentType: ${documentType}`,
    });
  }

  if (documentType === "") {
    return errorResult({
      errorMessage: `documentType in request body is an empty string.`,
    });
  }

  if (!isAllowableDocumentType(documentType)) {
    return errorResult({
      errorMessage: `documentType in request body is invalid. documentType: ${documentType}`,
    });
  }

  return successResult({
    sessionId,
    documentType,
  });
}

function isAllowableDocumentType(
  documentType: string,
): documentType is DocumentType {
  return (
    documentType === "NFC_PASSPORT" ||
    documentType === "UK_DRIVING_LICENCE" ||
    documentType === "UK_NFC_BRP"
  );
}

function isString(field: unknown): field is string {
  return typeof field === "string";
}

interface IAsyncBiometricTokenValidParsedRequestBody {
  sessionId: string;
  documentType: DocumentType;
}

type DocumentType = "NFC_PASSPORT" | "UK_DRIVING_LICENCE" | "UK_NFC_BRP";
