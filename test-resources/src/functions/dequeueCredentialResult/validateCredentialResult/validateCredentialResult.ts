import { SQSRecord } from "aws-lambda";
import {
  errorResult,
  FailureWithValue,
  Result,
  successResult,
} from "../../common/utils/result";
import { IProcessedMessage } from "../dequeueCredentialResultHandler";

export function validateCredentialResults(
  records: SQSRecord[],
): Result<IProcessedMessage[]> {
  if (records.length < 1) {
    return errorResult({
      errorMessage: `Records array is empty.`,
    });
  }

  const processedMessages: IProcessedMessage[] = [];
  for (const record of records) {
    if (!record.attributes?.SentTimestamp) {
      return errorResult({
        errorMessage: "SentTimestamp is missing from record",
      });
    }

    const { body: recordBody } = record;
    if (recordBody == null) {
      return errorResult({
        errorMessage: `Record body is either null or undefined.`,
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

    if (!credentialResult.sub) {
      return errorResult({
        errorMessage: `sub is missing from credential result. Credential result: { timestamp: "mockTimestamp" }`,
      });
    }

    processedMessages.push(credentialResult);
  }

  return successResult(processedMessages);
}
