import { LogAttributes } from "@aws-lambda-powertools/logger/types";

export class LogMessage implements LogAttributes {
  static readonly TEST_SESSIONS_INVALID_CONFIG = new LogMessage(
    "MOBILE_ASYNC_TEST_SESSIONS_INVALID_CONFIG",
    "Test sessions lambda started.",
  );
  static readonly TEST_SESSIONS_STARTED = new LogMessage(
    "MOBILE_ASYNC_TEST_SESSIONS_STARTED",
    "Test sessions lambda started.",
  );

  static readonly TEST_SESSIONS_REQUEST_BODY_INVALID = new LogMessage(
    "TEST_SESSIONS_REQUEST_BODY_INVALID",
    "Test sessions request body is not valid.",
  );

  static readonly CREATE_SESSION_CONDITIONAL_CHECK_FAILURE = new LogMessage(
    "MOBILE_ASYNC_CREATE_SESSION_CONDITION_CHECK_FAILURE",
    "Failed to create session in Sessions table due to a conditional check failure.",
  );

  static readonly CREATE_SESSION_UNEXPECTED_FAILURE = new LogMessage(
    "MOBILE_ASYNC_CREATE_SESSION_UNEXPECTED_FAILURE",
    "An unexpected failure occurred while trying to update the session in the Sessions table.",
  );

  private constructor(
    public readonly messageCode: string,
    public readonly message: string,
  ) {}

  [key: string]: string; // Index signature needed to implement LogAttributes
}
