import { LogAttributes } from "@aws-lambda-powertools/logger/types";

export class LogMessage implements LogAttributes {
  static readonly PUT_SESSION_STARTED = new LogMessage(
    "MOBILE_ASYNC_PUT_SESSION_STARTED",
    "Test sessions lambda started.",
  );

  static readonly PUT_SESSION_COMPLETED = new LogMessage(
    "MOBILE_ASYNC_PUT_SESSION_COMPLETED",
    "Test sessions lambda completed.",
  );

  static readonly PUT_SESSION_INVALID_CONFIG = new LogMessage(
    "MOBILE_ASYNC_PUT_SESSION_INVALID_CONFIG",
    "Test sessions lambda has missing environment variables.",
  );

  static readonly PUT_SESSION_REQUEST_PATH_PARAM_INVALID = new LogMessage(
    "MOBILE_ASYNC_PUT_SESSION_REQUEST_PATH_PARAM_INVALID",
    "The sessionId path parameter is missing or invalid",
  );

  private constructor(
    public readonly messageCode: string,
    public readonly message: string,
  ) {}

  [key: string]: string; // Index signature needed to implement LogAttributes
}
