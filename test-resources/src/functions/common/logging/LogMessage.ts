import { LogAttributes } from "@aws-lambda-powertools/logger/types";

export class LogMessage implements LogAttributes {
  static readonly TEST_SESSIONS_STARTED = new LogMessage(
    "MOBILE_ASYNC_TEST_SESSIONS_STARTED",
    "Test sessions lambda started.",
  );

  static readonly TEST_SESSIONS_COMPLETED = new LogMessage(
    "MOBILE_ASYNC_TEST_SESSIONS_COMPLETED",
    "Test sessions lambda completed.",
  );

  static readonly TEST_SESSIONS_INVALID_CONFIG = new LogMessage(
    "MOBILE_ASYNC_TEST_SESSIONS_INVALID_CONFIG",
    "Test sessions lambda has missing environment variables.",
  );

  static readonly TEST_SESSIONS_REQUEST_PATH_PARAM_INVALID = new LogMessage(
    "MOBILE_ASYNC_TEST_SESSIONS_REQUEST_PATH_PARAM_INVALID",
    "The sessionId in the path parameter is missing or invalid",
  );

  static readonly TEST_SESSIONS_CREATE_SESSION_FAILURE = new LogMessage(
    "MOBILE_ASYNC_CREATE_SESSION_CONDITION_CHECK_FAILURE",
    "Failed to create session in Sessions table due to a conditional check failure.",
  );
  private constructor(
    public readonly messageCode: string,
    public readonly message: string,
  ) {}

  [key: string]: string; // Index signature needed to implement LogAttributes
}
