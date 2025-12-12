import { Context, SQSEvent } from "aws-lambda";
import { getBackoffRetryDemoConfig } from "./getBackoffRetryDemoConfig";
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
  // 0. Get environment variables
  const configResult = getBackoffRetryDemoConfig(dependencies.env);
  if (configResult.isError) {
    logger.error(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_INVALID_CONFIG);
    throw new RetainMessageOnQueue("Invalid config");
  }

  const config = configResult.value;

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

  // 4. Handle OK-Not Ready response.
  const maxTries = 10;
  const initialDelaySec = 5;
  const backoffFactor = 2;

  // 5. Handle situation where no more tries will be made.
  if (tryIndex == maxTries) {
    // No tries left. In a real implementation, need to decide how to handle this.
    // e.g. could drop it entirely.  Or could post the message to a DLQ.
    logger.error(LogMessage.BACKOFF_RETRY_DEMO_RETRIES_EXHAUSTED, {
      sessionId,
      debug,
    });
    return;
  }

  // 6. Computes the back-off delay, capped at a max so it doesn't
  // exponentially grow unbounded.
  const delaySec = Math.min(
    Number(config.MAX_RETRY_DELAY_IN_SECONDS),
    initialDelaySec * (backoffFactor ** tryIndex),
  );

  // 7. Update message visibility.
  //const revealMessageAtMillis = timeNowEpochMillis + 1000*delaySec;
  await dependencies.changeMessageVisibility(
    sqsQueueUrlFromArn(record.eventSourceARN),
    record.receiptHandle,
    delaySec,
  );

  logger.info(LogMessage.BACKOFF_RETRY_DEMO_RETRYING, {
    sessionId,
    debug,
  });
  throw new RetainMessageOnQueue("Retry later");
}

const sqsQueueUrlFromArn = (
  _ /*queueArn*/: string,
) => {
  // TODO: impl this.
  return "https://sqs.eu-west-2.amazonaws.com/211125300205/phad-async-backend-backoff-retry-demo";
};

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
