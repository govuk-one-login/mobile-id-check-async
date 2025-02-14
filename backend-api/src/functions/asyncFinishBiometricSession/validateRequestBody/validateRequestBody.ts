import { errorResult, Result, successResult } from "../../utils/result";

export function validateRequestBody(
  body: string | null,
): Result<IAsyncFinishBiometricSessionValidParsedRequestBody> {
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

  const { sessionId, biometricSessionId } = parsedBody;

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

  if (!isValidUUID(sessionId)) {
    return errorResult({
      errorMessage: `sessionId in request body is not a valid UUID. sessionId: ${sessionId}`,
    });
  }

  if (biometricSessionId == null) {
    return errorResult({
      errorMessage: `biometricSessionId in request body is either null or undefined.`,
    });
  }

  if (!isString(biometricSessionId)) {
    return errorResult({
      errorMessage: `biometricSessionId in request body is not of type string. biometricSessionId: ${biometricSessionId}`,
    });
  }

  return successResult({
    sessionId,
    biometricSessionId,
  });
}

function isString(field: unknown): field is string {
  return typeof field === "string";
}

function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
  return uuidRegex.test(uuid);
}

interface IAsyncFinishBiometricSessionValidParsedRequestBody {
  sessionId: string;
  biometricSessionId: string;
}
