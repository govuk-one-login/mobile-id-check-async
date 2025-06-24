import {
  ErrorCategory,
  errorResult,
  Result,
  successResult,
} from "../../utils/result";
import { decodeJwt } from "jose";
import { ExpectedClaims } from "./types";

export function validateServiceTokenPayload(
  token: string,
  expectedClaims: ExpectedClaims,
): Result<string> {
  let payload;
  try {
    payload = decodeJwt(token);
  } catch {
    return errorResult({
      errorCategory: ErrorCategory.CLIENT_ERROR,
      errorMessage: "Failed to decode token payload",
    });
  }

  const currentTime = Math.floor(Date.now() / 1000);

  if (payload.nbf) {
    if (!hasValidNotBefore(payload, currentTime)) {
      return errorResult({
        errorCategory: ErrorCategory.CLIENT_ERROR,
        errorMessage: "Invalid not-before claim",
      });
    }
  }

  if (!hasValidIssuer(payload, expectedClaims.iss)) {
    return errorResult({
      errorCategory: ErrorCategory.CLIENT_ERROR,
      errorMessage: "Invalid issuer claim",
    });
  }

  if (!hasValidAudience(payload, expectedClaims.aud)) {
    return errorResult({
      errorCategory: ErrorCategory.CLIENT_ERROR,
      errorMessage: "Invalid audience claim",
    });
  }

  if (!hasValidScope(payload, expectedClaims.scope)) {
    return errorResult({
      errorCategory: ErrorCategory.CLIENT_ERROR,
      errorMessage: "Invalid scope claim",
    });
  }

  if (!hasValidSubject(payload)) {
    return errorResult({
      errorCategory: ErrorCategory.CLIENT_ERROR,
      errorMessage: "Invalid sub claim",
    });
  }

  if (!hasValidExpiry(payload, currentTime)) {
    return errorResult({
      errorCategory: ErrorCategory.CLIENT_ERROR,
      errorMessage: "Token expiry time is missing or is in the past",
    });
  }

  if (!hasValidIssuedAtTime(payload, currentTime)) {
    return errorResult({
      errorCategory: ErrorCategory.CLIENT_ERROR,
      errorMessage: "Token issued at time is missing or is in the future",
    });
  }

  return successResult(payload.sub);
}

export function hasValidIssuer(
  payload: object,
  expectedValue: string,
): payload is Record<"iss", string> {
  return (
    "iss" in payload &&
    typeof payload.iss === "string" &&
    payload.iss === expectedValue
  );
}

export function hasValidAudience(
  payload: object,
  expectedValue: string,
): payload is Record<"aud", string> {
  return "aud" in payload && payload.aud === expectedValue;
}

export function hasValidScope(
  payload: object,
  expectedValue: string,
): payload is Record<"scope", string> {
  return "scope" in payload && payload.scope === expectedValue;
}

export function hasValidSubject(
  payload: object,
): payload is Record<"sub", string> {
  return "sub" in payload && typeof payload.sub === "string";
}

export function hasValidIssuedAtTime(
  payload: object,
  currentTime: number,
): payload is Record<"iat", number> {
  return (
    "iat" in payload &&
    typeof payload.iat === "number" &&
    currentTime >= payload.iat
  );
}

export function hasValidExpiry(
  payload: object,
  currentTime: number,
): payload is Record<"exp", number> {
  return (
    "exp" in payload &&
    typeof payload.exp === "number" &&
    currentTime < payload.exp
  );
}

export function hasValidNotBefore(
  payload: object,
  currentTime: number,
): payload is Record<"nbf", number> {
  return (
    "nbf" in payload &&
    typeof payload.nbf === "number" &&
    currentTime > payload.nbf
  );
}
