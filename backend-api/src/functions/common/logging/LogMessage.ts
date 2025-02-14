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

  static readonly UPDATE_SESSION_ATTEMPT = new LogMessage(
    "MOBILE_ASYNC_UPDATE_SESSION_ATTEMPT",
    "Attempting to update user session in DynamoDB.",
  );

  static readonly UPDATE_SESSION_SUCCESS = new LogMessage(
    "MOBILE_ASYNC_UPDATE_SESSION_SUCCESS",
    "Successfully updated user session in DynamoDB.",
  );

  static readonly UPDATE_SESSION_UNEXPECTED_FAILURE = new LogMessage(
    "MOBILE_ASYNC_UPDATE_SESSION_UNEXPECTED_FAILURE",
    "An unexpected failure occurred while trying to update the user session in DynamoDB.",
  );

  static readonly UPDATE_SESSION_CONDITIONAL_CHECK_FAILURE = new LogMessage(
    "MOBILE_ASYNC_UPDATE_SESSION_CONDITIONAL_CHECK_FAILURE",
    "One or more required conditions were not met when trying to update the user session in DynamoDB.",
  );

  static readonly UPDATE_SESSION_SESSION_NOT_FOUND = new LogMessage(
    "MOBILE_ASYNC_UPDATE_SESSION_SESSION_NOT_FOUND",
    "No session found while trying to update the user session in DynamoDB.",
  );

  static readonly ERROR_WRITING_AUDIT_EVENT = new LogMessage(
    "MOBILE_ASYNC_ERROR_WRITING_AUDIT_EVENT",
    "Unexpected error writing audit event to SQS",
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
  static readonly BIOMETRIC_TOKEN_GET_BIOMETRIC_TOKEN_FROM_READID_ATTEMPT =
    new LogMessage(
      "MOBILE_ASYNC_BIOMETRIC_TOKEN_GET_BIOMETRIC_TOKEN_FROM_READID_ATTEMPT",
      "Attempting to retrieve biometric access token from ReadID",
    );
  static readonly BIOMETRIC_TOKEN_GET_BIOMETRIC_TOKEN_FROM_READID_FAILURE =
    new LogMessage(
      "MOBILE_ASYNC_BIOMETRIC_TOKEN_GET_BIOMETRIC_TOKEN_FROM_READID_FAILURE",
      "Failed to retrieve biometric access token from ReadID",
    );
  static readonly BIOMETRIC_TOKEN_GET_BIOMETRIC_TOKEN_FROM_READID_SUCCESS =
    new LogMessage(
      "MOBILE_ASYNC_BIOMETRIC_TOKEN_GET_BIOMETRIC_TOKEN_FROM_READID_SUCCESS",
      "Successfully retrieved biometric access token from ReadID",
    );

  // Finish Biometric Session
  static readonly FINISH_BIOMETRIC_SESSION_STARTED = new LogMessage(
    "MOBILE_ASYNC_FINISH_BIOMETRIC_SESSION_STARTED",
    "Lambda handler processing has started.",
  );
  static readonly FINISH_BIOMETRIC_SESSION_COMPLETED = new LogMessage(
    "MOBILE_ASYNC_FINISH_BIOMETRIC_SESSION_COMPLETED",
    "Lambda handler processing has completed successfully.",
  );

  private constructor(
    public readonly messageCode: string,
    public readonly message: string,
  ) {}

  [key: string]: string; // Index signature needed to implement LogAttributes
}
