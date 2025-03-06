import { emptySuccess, errorResult, Result } from "../../../utils/result";
import { isString, isValidUUIDv4 } from "../../../utils/utils";

export function validateSessionId(sessionId: string): Result<void> {
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

  if (!isValidUUIDv4(sessionId)) {
    return errorResult({
      errorMessage: `sessionId in request body is not a valid v4 UUID. sessionId: ${sessionId}`,
    });
  }

  return emptySuccess();
}
