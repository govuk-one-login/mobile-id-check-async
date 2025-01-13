import {
  ErrorCategory,
  errorResult,
  Result,
  successResult,
} from "../../utils/result";

export const getBearerToken = (
  authorizationHeader: string | undefined,
): Result<string> => {
  if (authorizationHeader == null) {
    return errorResult({
      errorMessage: "No Authentication header present",
      errorCategory: ErrorCategory.CLIENT_ERROR,
    });
  }

  if (!authorizationHeader.startsWith("Bearer ")) {
    return errorResult({
      errorMessage:
        "Invalid authentication header format - does not start with Bearer",
      errorCategory: ErrorCategory.CLIENT_ERROR,
    });
  }

  if (authorizationHeader.split(" ").length !== 2) {
    return errorResult({
      errorMessage: "Invalid authentication header format - contains spaces",
      errorCategory: ErrorCategory.CLIENT_ERROR,
    });
  }

  const token = authorizationHeader.split(" ")[1];

  if (token.length == 0) {
    return errorResult({
      errorMessage: "Invalid authentication header format - missing token",
      errorCategory: ErrorCategory.CLIENT_ERROR,
    });
  }

  return successResult(token);
};
