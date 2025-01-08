import { LogAttributes } from "@aws-lambda-powertools/logger/types";

export class LogMessage implements LogAttributes {
  // Shared
  static readonly GET_SECRETS_FROM_PARAMETER_STORE_ATTEMPT = new LogMessage(
    "MOBILE_ASYNC_GET_SECRETS_FROM_PARAMETER_STORE_ATTEMPT",
    "Attempting to retrieve one or more secrets from SSM Parameter Store.",
  );

  static readonly GET_SECRETS_FROM_PARAMETER_STORE_SUCCESS = new LogMessage(
    "MOBILE_ASYNC_GET_SECRETS_FROM_PARAMETER_STORE_SUCCESS",
    "Successfully retrieved one or more secrets from SSM Parameter Store.",
  );

  static readonly GET_SECRETS_FROM_PARAMETER_STORE_FAILURE = new LogMessage(
    "MOBILE_ASYNC_GET_SECRETS_FROM_PARAMETER_STORE_FAILURE",
    "Failed to retrieve one or more secrets from SSM Parameter Store.",
  );

  // Biometric Token
  static readonly BIOMETRIC_TOKEN_STARTED = new LogMessage(
    "MOBILE_ASYNC_BIOMETRIC_TOKEN_STARTED",
    "Lambda handler processing has started.",
  );
  static readonly BIOMETRIC_TOKEN_COMPLETED = new LogMessage(
    "MOBILE_ASYNC_BIOMETRIC_TOKEN_COMPLETED",
    "Lambda handler processing has completed successfully.",
  );
  static readonly BIOMETRIC_TOKEN_INVALID_CONFIG = new LogMessage(
    "MOBILE_ASYNC_BIOMETRIC_TOKEN_INVALID_CONFIG",
    "One or more required environment variables were missing or invalid.",
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
