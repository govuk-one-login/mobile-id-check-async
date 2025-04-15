import { errorResult, Result, successResult } from "../../common/utils/result";

export interface IValidCredentialResult {
  sub: string;
  [key: string]: string;
}

export function validateCredentialResult(
  recordBody: string,
): Result<IValidCredentialResult> {
  let credentialResult;
  try {
    credentialResult = JSON.parse(recordBody);
  } catch (error) {
    return errorResult({
      errorMessage: `Record body could not be parsed as JSON. ${error}`,
    });
  }

  const { sub } = credentialResult;
  if (!sub) {
    return errorResult({
      errorMessage: "sub is missing from record body",
    });
  }

  if (!isString(sub)) {
    return errorResult({
      errorMessage: `sub is not a string. Incoming sub is type: ${typeof sub}`,
    });
  }

  return successResult(credentialResult);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
