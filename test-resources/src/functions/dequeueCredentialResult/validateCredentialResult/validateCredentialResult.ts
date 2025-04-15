import { errorResult, Result, successResult } from "../../common/utils/result";

export interface IValidCredentialResultData {
  sub: string;
  credentialResultBody: object;
}

export function validateCredentialResult(
  recordBody: string,
): Result<IValidCredentialResultData> {
  let credentialResultBody;
  try {
    credentialResultBody = JSON.parse(recordBody);
  } catch (error) {
    return errorResult({
      errorMessage: `Record body could not be parsed as JSON. ${error}`,
    });
  }

  const { sub } = credentialResultBody;
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

  return successResult({
    sub,
    credentialResultBody,
  });
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
