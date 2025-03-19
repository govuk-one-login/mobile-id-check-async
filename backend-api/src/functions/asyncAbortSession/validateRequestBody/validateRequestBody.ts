import { validateSessionId } from "../../common/request/validateSessionId/validateSessionId";
import { errorResult, Result, successResult } from "../../utils/result";

export function validateRequestBody(
  body: string | null,
): Result<IAsyncAbortSessionValidParsedRequestBody> {
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

  const { sessionId } = parsedBody;

  const validateSessionIdResult = validateSessionId(sessionId);
  if (validateSessionIdResult.isError) {
    return validateSessionIdResult;
  }

  return successResult(sessionId);
}

type IAsyncAbortSessionValidParsedRequestBody = string;
