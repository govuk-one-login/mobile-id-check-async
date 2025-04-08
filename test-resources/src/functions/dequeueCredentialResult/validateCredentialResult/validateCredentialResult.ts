import { SQSRecord } from "aws-lambda";
import { errorResult, Result, successResult } from "../../common/utils/result";
import { IProcessedMessage } from "../dequeueCredentialResultHandler";

export function validateCredentialResult(
  record: SQSRecord,
): Result<IProcessedMessage> {
  const timestamp = record.attributes.SentTimestamp;
  if (!timestamp) {
    return errorResult({
      errorMessage: "SentTimestamp is missing from record",
    });
  }

  const { body: recordBody } = record;
  if (!recordBody) {
    return errorResult({
      errorMessage: "Record body is empty.",
    });
  }

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
      errorMessage: "sub is missing from credential result.",
    });
  }

  const subType = typeof sub;
  if (!isString(sub)) {
    return errorResult({
      errorMessage: `sub type is incorrect. sub type: ${subType}.`,
    });
  }

  return successResult({ sub, timestamp });
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
