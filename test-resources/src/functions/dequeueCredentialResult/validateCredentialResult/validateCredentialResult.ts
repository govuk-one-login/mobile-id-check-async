import { SQSRecord } from "aws-lambda";
import { errorResult, Result, successResult } from "../../common/utils/result";

export interface IValidCredentialResultData {
  sub: string;
  sentTimestamp: string;
  credentialResultBody: object;
}

export function validateCredentialResult(
  record: SQSRecord,
): Result<IValidCredentialResultData> {
  const sentTimestamp = record.attributes.SentTimestamp;
  if (!sentTimestamp) {
    return errorResult({
      errorMessage: "SentTimestamp is missing from record",
    });
  }

  let credentialResultBody;
  try {
    credentialResultBody = JSON.parse(record.body);
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
    sentTimestamp,
    credentialResultBody,
  });
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
