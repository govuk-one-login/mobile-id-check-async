import { validateSessionId } from "../../common/request/validateSessionId/validateSessionId";
import { errorResult, Result, successResult } from "../../utils/result";
import { isString } from "../../utils/utils";

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

  const validateSessionIdResult = validateSessionId(sessionId);
  if (validateSessionIdResult.isError) {
    return validateSessionIdResult;
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
