import { errorResult, Result, successResult } from "../../common/utils/result";

export interface IValidCredentialResultData {
  sub: string;
  credentialResult: string;
}

export function validateCredentialResult(
  recordBody: string,
): Result<IValidCredentialResultData> {
  let credentialResult;
  try {
    credentialResult = JSON.parse(recordBody) as unknown;
  } catch (error) {
    return errorResult({
      errorMessage: `Record body could not be parsed as JSON. ${error}`,
    });
  }

  if (credentialResult == null) {
    return errorResult({
      errorMessage: "credential result is null",
    });
  }

  if (typeof credentialResult !== "object") {
    return errorResult({
      errorMessage: "credentialResult is not an object",
    });
  }

  if (!("sub" in credentialResult)) {
    return errorResult({
      errorMessage: "sub is missing from record body",
    });
  }

  const { sub } = credentialResult;
  if (!sub) {
    return errorResult({
      errorMessage: "sub is invalid",
    });
  }

  if (!isString(sub)) {
    return errorResult({
      errorMessage: `sub is not a string. Incoming sub is type: ${typeof sub}`,
    });
  }

  return successResult({ sub, credentialResult: recordBody });
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
