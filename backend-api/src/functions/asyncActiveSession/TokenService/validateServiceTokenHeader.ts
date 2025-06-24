import {
  ErrorCategory,
  errorResult,
  Result,
  successResult,
} from "../../utils/result";
import { decodeProtectedHeader } from "jose";

export function validateServiceTokenHeader(
  token: string,
): Result<{ kid: string }> {
  let header;
  try {
    header = decodeProtectedHeader(token);
  } catch (error) {
    return errorResult({
      errorCategory: ErrorCategory.CLIENT_ERROR,
      errorMessage: `Failed to decode token header: ${error}`,
    });
  }

  if (!hasValidKid(header)) {
    return errorResult({
      errorCategory: ErrorCategory.CLIENT_ERROR,
      errorMessage: "Invalid kid claim",
    });
  }

  return successResult({
    kid: header.kid,
  });
}

export function hasValidKid(
  decodedHeader: object,
): decodedHeader is Record<"kid", string> {
  return "kid" in decodedHeader && typeof decodedHeader.kid === "string";
}
