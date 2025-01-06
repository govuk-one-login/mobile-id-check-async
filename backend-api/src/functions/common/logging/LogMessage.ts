import { LogAttributes } from "@aws-lambda-powertools/logger/types";

export class LogMessage implements LogAttributes {
  static readonly BIOMETRIC_TOKEN_STARTED = new LogMessage(
    "MOBILE_ASYNC_BIOMETRIC_TOKEN_STARTED",
    "Lambda handler processing has started.",
  );
  static readonly BIOMETRIC_TOKEN_COMPLETED = new LogMessage(
    "MOBILE_ASYNC_BIOMETRIC_TOKEN_COMPLETED",
    "Lambda handler processing has completed successfully.",
  );
  static readonly BIOMETRIC_TOKEN_REQUEST_BODY_INVALID = new LogMessage(
    "MOBILE_ASYNC_BIOMETRIC_TOKEN_REQUEST_BODY_INVALID",
    "The incoming request body was missing or invalid.",
  );

  private constructor(
    public readonly messageCode: string,
    public readonly message: string,
  ) {}

  [key: string]: string; // Index signature needed to implement LogAttributes
}
