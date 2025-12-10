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
  logger.info(LogMessage.BACKOFF_RETRY_DEMO_STARTED);

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
  let retryState:
    | { delaySec: number; factor: number; triesLeft: number }
    | undefined;
  ({ retryState } = parsedBody);

  // 2. Mimic making the possibly-unreliable external call to ReadID
  const failed: boolean = 100*Math.random() < (pctFailure || 0);

  // 3. Handle OK-Ready response.
  if (!failed) {
    logger.info(LogMessage.BACKOFF_RETRY_DEMO_COMPLETED, {
      sessionId,
      retryState,
    });
    return;
  }

  // 4. Handle OK-Not Ready response.  On first attempt we won't have any retry state, so choose a default.
  // The default can be based on document type in a real implementation.
  if (!retryState) {
    retryState = {
      delaySec: 5,
      factor: 2,
      triesLeft: 3,
    };
  }

  // 5. Handle situation where no more tries will be made.
  retryState.triesLeft--;
  if (retryState.triesLeft == 0) {
    // No tries left. In a real implementation, need to decide how to handle this.
    // e.g. could drop it entirely.  Or could post the message to a DLQ.
    logger.error(LogMessage.BACKOFF_RETRY_DEMO_RETRIES_EXHAUSTED, {
      sessionId,
      retryState,
    });
    return;
  }

  // 6. Computes the _next_ try's delay, to push to the queue.  Cap it at a max so it doesn't
  // exponentially grow unbounded. delaySec is the delay time for _this_ retry.
  const delaySec = retryState.delaySec;
  retryState.delaySec = Math.min(
    Number(config.MAX_RETRY_DELAY_IN_SECONDS),
    retryState.delaySec * retryState.factor,
  );

  // 7. Post back to the demo queue, delayed by _this_ time's delay, delaySec.
  await dependencies.sendMessageToSqsWithDelay(
    config.DEMO_SQS,
    {
      sessionId,
      pctFailure,
      retryState,
    },
    delaySec,
  );

  logger.info(LogMessage.BACKOFF_RETRY_DEMO_RETRYING, {
    sessionId,
    retryState,
  });
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

  if ("retryState" in parsedBody) {
    if (typeof parsedBody.retryState !== "object") {
      return false;
    }
    if (
      parsedBody.retryState !== null &&
      "delaySec" in parsedBody.retryState &&
      typeof parsedBody.retryState.delaySec !== "number"
    ) {
      return false;
    }
    if (
      parsedBody.retryState !== null &&
      "factor" in parsedBody.retryState &&
      typeof parsedBody.retryState.factor !== "number"
    ) {
      return false;
    }
    if (
      parsedBody.retryState !== null &&
      "triesLeft" in parsedBody.retryState &&
      typeof parsedBody.retryState.triesLeft !== "number"
    ) {
      return false;
    }
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
