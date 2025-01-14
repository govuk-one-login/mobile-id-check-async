import { errorResult, Result, successResult } from "../utils/result";

export function getConfig(env: NodeJS.ProcessEnv): Result<Config> {
  if (!env.EVENTS_TABLE_NAME) {
    return errorResult({
      errorMessage: "Missing environment variable: EVENTS_TABLE_NAME",
    });
  }
  if (!env.TXMA_EVENT_TTL_DURATION_IN_SECONDS) {
    return errorResult({
      errorMessage:
        "Missing environment variable: TXMA_EVENT_TTL_DURATION_IN_SECONDS",
    });
  }

  return successResult({
    EVENTS_TABLE_NAME: env.EVENTS_TABLE_NAME,
    TXMA_EVENT_TTL_DURATION_IN_SECONDS: env.TXMA_EVENT_TTL_DURATION_IN_SECONDS,
  });
}

export interface Config {
  EVENTS_TABLE_NAME: string;
  TXMA_EVENT_TTL_DURATION_IN_SECONDS: string;
}
