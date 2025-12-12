import { Context, SQSEvent } from "aws-lambda";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { setupLogger } from "../common/logging/setupLogger";
import {
  BackoffRetryDemoDependencies,
  runtimeDependencies,
} from "./handlerDependencies";
import { RetainMessageOnQueue } from "./retainMessageOnQueue";

export async function lambdaHandlerConstructor(
  dependencies: BackoffRetryDemoDependencies,
  event: SQSEvent,
  context: Context,
): Promise<void> {
  setupLogger(context);

  // 1. Unpack the JSON payload from the SQS Event
  if (event.Records.length !== 1) {
    logger.error(LogMessage.BACKOFF_RETRY_DEMO_INVALID_SQS_EVENT, {
      errorMessage: `Expected exactly one record, got ${event.Records.length}.`,
    });
  }

  const record = event.Records[0];
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(record.body);
  } catch {
    logger.error(LogMessage.BACKOFF_RETRY_DEMO_INVALID_SQS_EVENT, {
      errorMessage: `Failed to parse event body. Body: ${record.body}`,
    });
    return;
  }

  if (!isParsedBody(parsedBody)) {
    logger.error(LogMessage.BACKOFF_RETRY_DEMO_INVALID_SQS_EVENT, {
      errorMessage: `Parsed event body not in expected shape. Parsed event body: ${JSON.stringify(parsedBody)}`,
    });
    return;
  }

  const { sessionId, pctFailure } = parsedBody;
  
  const tryIndex = parseInt(record.attributes.ApproximateReceiveCount);
  const firstSentTimeEpochMillis = parseInt(record.attributes.ApproximateFirstReceiveTimestamp);
  const timeNowEpochMillis = Date.now();
  const timeElapsedSecs = (timeNowEpochMillis - firstSentTimeEpochMillis) / 1000;
  const debug = {
    pctFailure,
    tryIndex,
    firstSentTimeEpochMillis,
    timeNowEpochMillis,
    timeElapsedSecs,
  };

  logger.info(LogMessage.BACKOFF_RETRY_DEMO_STARTED, {
    sessionId,
    debug,
  });

  // 2. Mimic making the possibly-unreliable external call to ReadID
  const failed: boolean = 100*Math.random() < (pctFailure || 0);

  // 3. Handle OK-Ready response.
  if (!failed) {
    logger.info(LogMessage.BACKOFF_RETRY_DEMO_COMPLETED, {
      sessionId,
      debug,
    });
    return;
  }

  // 4. Trigger back-off and retry by throwing.
  logger.info(LogMessage.BACKOFF_RETRY_DEMO_RETRYING, {
    sessionId,
    debug,
  });
  throw new RetainMessageOnQueue("Retrying later");
}

const isParsedBody = (
  parsedBody: unknown,
): parsedBody is {
  sessionId: string;
  pctFailure: number;
  retryState?: { delaySec: number; factor: number; triesLeft: number };
} => {
  if (
    typeof parsedBody !== "object" ||
    parsedBody == null ||
    Array.isArray(parsedBody)
  ) {
    return false;
  }
  if ("pctFailure" in parsedBody && (typeof parsedBody.pctFailure !== "number")) {
    return false;
  }
  if (!("sessionId" in parsedBody) || (typeof parsedBody.sessionId !== "string")) {
    return false;
  }
  return true;
};

export const lambdaHandler = lambdaHandlerConstructor.bind(
  null,
  runtimeDependencies,
);
