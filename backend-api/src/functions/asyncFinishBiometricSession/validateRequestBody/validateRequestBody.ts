import { errorResult, Result, successResult } from "../../utils/result";
import { isString, isValidUUIDv4 } from "../../utils/utils";

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

  if (!isValidUUIDv4(sessionId)) {
    return errorResult({
      errorMessage: `sessionId in request body is not a valid v4 UUID. sessionId: ${sessionId}`,
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

interface IAsyncFinishBiometricSessionValidParsedRequestBody {
  sessionId: string;
  biometricSessionId: string;
}
