import { SQSRecord } from "aws-lambda";
import { errorResult, Result, successResult } from "../../common/utils/result";
import { IProcessedMessage } from "../dequeueCredentialResultHandler";

export function validateCredentialResult(
  record: SQSRecord,
): Result<IProcessedMessage> {
  const sentTimestamp = record.attributes.SentTimestamp;
  if (!sentTimestamp) {
    return errorResult({
      errorMessage: "SentTimestamp is missing from record",
    });
  }

  const { body } = record;
  if (!body) {
    return errorResult({
      errorMessage: "Record body is empty.",
    });
  }

  let credentialResult;
  try {
    credentialResult = JSON.parse(body);
  } catch (error) {
    return errorResult({
      errorMessage: `Record body could not be parsed as JSON. ${error}`,
    });
  }

  const { sub } = credentialResult;
  if (!sub) {
    return errorResult({
      errorMessage: "sub is missing from record body.",
    });
  }

  if (!isString(sub)) {
    return errorResult({
      errorMessage: `sub is an incorrect type: ${typeof sub} - should be a string.`,
    });
  }

  return successResult({ sub, sentTimestamp });
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
