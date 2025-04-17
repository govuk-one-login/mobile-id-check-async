import { LogAttributes } from "@aws-lambda-powertools/logger/types";

export class LogMessage implements LogAttributes {
  // Shared
  static readonly GET_CLIENT_REGISTRY_FAILURE = new LogMessage(
    "MOBILE_ASYNC_GET_CLIENT_REGISTRY_FAILURE",
    "Failed to retrieve client registry from Secrets Manager.",
  );

  static readonly CLIENT_NOT_FOUND_IN_REGISTRY = new LogMessage(
    "MOBILE_ASYNC_CLIENT_NOT_FOUND_IN_REGISTRY",
    "Supplied client credentials were not be found in client registry.",
  );

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

  static readonly CREATE_SESSION_FAILURE = new LogMessage(
    "MOBILE_ASYNC_CREATE_SESSION_FAILURE",
    "Failed to create user session in DynamoDB.",
  );

  static readonly GET_ACTIVE_SESSION_FAILURE = new LogMessage(
    "MOBILE_ASYNC_GET_ACTIVE_SESSION_FAILURE",
    "Error occurred while attempting to retrieve active session by subject ID.",
  );

  static readonly GET_SESSION_ATTEMPT = new LogMessage(
    "MOBILE_ASYNC_GET_SESSION_ATTEMPT",
    "Attempting to retrieve session by session ID from DynamoDB.",
  );

  static readonly GET_SESSION_UNEXPECTED_FAILURE = new LogMessage(
    "MOBILE_ASYNC_GET_SESSION_UNEXPECTED_FAILURE",
    "An unexpected failure occurred while trying to retrieve the user session from DynamoDB.",
  );

  static readonly GET_SESSION_SESSION_NOT_FOUND = new LogMessage(
    "MOBILE_ASYNC_GET_SESSION_SESSION_NOT_FOUND",
    "No session found when attempting to get the user session from DynamoDB.",
  );

  static readonly GET_SESSION_SESSION_INVALID = new LogMessage(
    "MOBILE_ASYNC_GET_SESSION_SESSION_INVALID",
    "The session retrieved from DynamoDB is not valid.",
  );

  static readonly GET_SESSION_SUCCESS = new LogMessage(
    "MOBILE_ASYNC_GET_SESSION_SUCCESS",
    "Successfully retrieved user session from DynamoDB.",
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

  static readonly IP_ADDRESS_FROM_CLOUDFRONT_IS_MALFORMED = new LogMessage(
    "MOBILE_ASYNC_IP_ADDRESS_FROM_CLOUDFRONT_IS_MALFORMED",
    "IP Address could not be retrieved from the cloudfront-viewer-address header and the fallback value of event.requestContext.identity.sourceIp will be used for TxMA events.",
  );

  static readonly SEND_MESSAGE_TO_SQS_ATTEMPT = new LogMessage(
    "MOBILE_ASYNC_SEND_MESSAGE_TO_SQS_ATTEMPT",
    "Attempting to write message to SQS.",
  );

  static readonly SEND_MESSAGE_TO_SQS_FAILURE = new LogMessage(
    "MOBILE_ASYNC_SEND_MESSAGE_TO_SQS_FAILURE",
    "An unexpected failure occurred while attempting to write message to SQS.",
  );

  static readonly SEND_MESSAGE_TO_SQS_SUCCESS = new LogMessage(
    "MOBILE_ASYNC_SEND_MESSAGE_TO_SQS_SUCCESS",
    "Successfully writen message to SQS.",
  );

  // Token
  static readonly TOKEN_STARTED = new LogMessage(
    "MOBILE_ASYNC_TOKEN_STARTED",
    "Lambda handler processing has started.",
  );
  static readonly TOKEN_COMPLETED = new LogMessage(
    "MOBILE_ASYNC_TOKEN_COMPLETED",
    "Lambda handler processing has completed successfully.",
  );
  static readonly TOKEN_INVALID_CONFIG = new LogMessage(
    "MOBILE_ASYNC_TOKEN_INVALID_CONFIG",
    "One or more required environment variables were missing or invalid.",
  );
  static readonly TOKEN_REQUEST_BODY_INVALID = new LogMessage(
    "MOBILE_ASYNC_TOKEN_REQUEST_BODY_INVALID",
    "The incoming request body was missing or invalid.",
  );
  static readonly TOKEN_REQUEST_HEADERS_INVALID = new LogMessage(
    "MOBILE_ASYNC_TOKEN_REQUEST_HEADERS_INVALID",
    "The incoming request headers were missing or invalid.",
  );
  static readonly TOKEN_FAILED_TO_MINT_TOKEN = new LogMessage(
    "MOBILE_ASYNC_TOKEN_FAILED_TO_MINT_TOKEN",
    "Failed to mint and sign a new access token.",
  );

  // Credential
  static readonly CREDENTIAL_STARTED = new LogMessage(
    "MOBILE_ASYNC_CREDENTIAL_STARTED",
    "Lambda handler processing has started.",
  );
  static readonly CREDENTIAL_COMPLETED = new LogMessage(
    "MOBILE_ASYNC_CREDENTIAL_COMPLETED",
    "Lambda handler processing has completed successfully.",
  );
  static readonly CREDENTIAL_INVALID_CONFIG = new LogMessage(
    "MOBILE_ASYNC_CREDENTIAL_INVALID_CONFIG",
    "One or more required environment variables were missing or invalid.",
  );
  static readonly CREDENTIAL_AUTHORIZATION_HEADER_INVALID = new LogMessage(
    "MOBILE_ASYNC_CREDENTIAL_AUTHORIZATION_HEADER_INVALID",
    "Bearer token not present in Authorization header.",
  );
  static readonly CREDENTIAL_INVALID_CLAIMS_IN_AUTHORIZATION_JWT =
    new LogMessage(
      "MOBILE_ASYNC_CREDENTIAL_INVALID_CLAIMS_IN_AUTHORIZATION_JWT",
      "One or more claims in the provided bearer token are invalid.",
    );
  static readonly CREDENTIAL_REQUEST_BODY_INVALID = new LogMessage(
    "MOBILE_ASYNC_CREDENTIAL_REQUEST_BODY_INVALID",
    "Request body was missing or invalid.",
  );
  static readonly CREDENTIAL_FAILED_TO_VALIDATE_TOKEN_SIGNATURE =
    new LogMessage(
      "MOBILE_ASYNC_CREDENTIAL_FAILED_TO_VALIDATE_TOKEN_SIGNATURE",
      "Bearer token signature could not be validated using the ID Check signing key.",
    );

  // Active Session
  static readonly ACTIVE_SESSION_STARTED = new LogMessage(
    "MOBILE_ASYNC_ACTIVE_SESSION_STARTED",
    "Lambda handler processing has started.",
  );
  static readonly ACTIVE_SESSION_INVALID_CONFIG = new LogMessage(
    "MOBILE_ASYNC_ACTIVE_SESSION_INVALID_CONFIG",
    "One or more required environment variables were missing or invalid.",
  );
  static readonly ACTIVE_SESSION_AUTHORIZATION_HEADER_INVALID = new LogMessage(
    "MOBILE_ASYNC_ACTIVE_SESSION_AUTHORIZATION_HEADER_INVALID",
    "Bearer token not present in authorization header.",
  );
  static readonly ACTIVE_SESSION_JWE_DECRYPTION_ERROR = new LogMessage(
    "MOBILE_ASYNC_ACTIVE_SESSION_JWE_DECRYPTION_ERROR",
    "Error whilst decrypting JWE service token.",
  );
  static readonly ACTIVE_SESSION_SERVICE_TOKEN_VALIDATION_ERROR =
    new LogMessage(
      "MOBILE_ASYNC_ACTIVE_SESSION_SERVICE_TOKEN_VALIDATION_ERROR",
      "Error whilst validating decrypted service token.",
    );
  static readonly ACTIVE_SESSION_ACTIVE_SESSION_NOT_FOUND = new LogMessage(
    "MOBILE_ASYNC_ACTIVE_SESSION_ACTIVE_SESSION_NOT_FOUND",
    "An active session was not found.",
  );
  static readonly ACTIVE_SESSION_COMPLETED = new LogMessage(
    "MOBILE_ASYNC_ACTIVE_SESSION_COMPLETED",
    "Lambda handler processing has completed successfully.",
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
  static readonly FINISH_BIOMETRIC_SESSION_REQUEST_BODY_INVALID =
    new LogMessage(
      "MOBILE_ASYNC_FINISH_BIOMETRIC_SESSION_REQUEST_BODY_INVALID",
      "The incoming request body was missing or invalid.",
    );
  static readonly FINISH_BIOMETRIC_SESSION_INVALID_CONFIG = new LogMessage(
    "MOBILE_ASYNC_FINISH_BIOMETRIC_SESSION_INVALID_CONFIG",
    "One or more required environment variables were missing or invalid.",
  );
  static readonly FINISH_BIOMETRIC_SESSION_SEND_MESSAGE_TO_VENDOR_PROCESSING_QUEUE_FAILURE =
    new LogMessage(
      "MOBILE_ASYNC_FINISH_BIOMETRIC_SESSION_SEND_MESSAGE_TO_VENDOR_PROCESSING_QUEUE_FAILURE",
      "Failed to send message to vendor processing queue.",
    );

  // Abort Session
  static readonly ABORT_SESSION_STARTED = new LogMessage(
    "MOBILE_ASYNC_ABORT_SESSION_STARTED",
    "Lambda handler processing has started.",
  );
  static readonly ABORT_SESSION_COMPLETED = new LogMessage(
    "MOBILE_ASYNC_ABORT_SESSION_COMPLETED",
    "Lambda handler processing has completed successfully.",
  );
  static readonly ABORT_SESSION_INVALID_CONFIG = new LogMessage(
    "MOBILE_ASYNC_ABORT_SESSION_INVALID_CONFIG",
    "One or more required environment variables were missing or invalid.",
  );
  static readonly ABORT_SESSION_REQUEST_BODY_INVALID = new LogMessage(
    "MOBILE_ASYNC_ABORT_SESSION_REQUEST_BODY_INVALID",
    "The incoming request body was missing or invalid.",
  );

  // TxMA Event
  static readonly TXMA_EVENT_STARTED = new LogMessage(
    "MOBILE_ASYNC_TXMA_EVENT_STARTED",
    "Lambda handler processing has started.",
  );
  static readonly TXMA_EVENT_INVALID_CONFIG = new LogMessage(
    "MOBILE_ASYNC_TXMA_EVENT_INVALID_CONFIG",
    "One or more required environment variables were missing or invalid.",
  );
  static readonly TXMA_EVENT_REQUEST_BODY_INVALID = new LogMessage(
    "MOBILE_ASYNC_TXMA_EVENT_REQUEST_BODY_INVALID",
    "The incoming request body was missing or invalid.",
  );
  static readonly TXMA_EVENT_SESSION_INVALID = new LogMessage(
    "MOBILE_ASYNC_TXMA_EVENT_SESSION_INVALID",
    "The retrieved session is not valid",
  );
  static readonly TXMA_EVENT_COMPLETED = new LogMessage(
    "MOBILE_ASYNC_TXMA_EVENT_COMPLETED",
    "Lambda handler processing has completed successfully.",
  );

  // Issue Biometric Credential
  static readonly ISSUE_BIOMETRIC_CREDENTIAL_STARTED = new LogMessage(
    "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_STARTED",
    "Lambda handler processing has started.",
  );
  static readonly ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED = new LogMessage(
    "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
    "Lambda handler processing has completed without issue.",
  );
  static readonly ISSUE_BIOMETRIC_CREDENTIAL_INVALID_CONFIG = new LogMessage(
    "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_INVALID_CONFIG",
    "One or more required environment variables were missing or invalid.",
  );

  static readonly ISSUE_BIOMETRIC_CREDENTIAL_GET_FROM_READID_FAILURE =
    new LogMessage(
      "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_GET_FROM_READID_FAILURE",
      "Failed to retrieve biometric session from ReadID",
    );
  static readonly ISSUE_BIOMETRIC_CREDENTIAL_GET_FROM_READID_SUCCESS =
    new LogMessage(
      "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_GET_FROM_READID_SUCCESS",
      "Successfully retrieved biometric session from ReadID",
    );
  static readonly ISSUE_BIOMETRIC_CREDENTIAL_GET_FROM_READID_ATTEMPT =
    new LogMessage(
      "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_GET_FROM_READID_ATTEMPT",
      "Retrieving biometric session from ReadID",
    );
  static readonly ISSUE_BIOMETRIC_CREDENTIAL_BIOMETRIC_SESSION_NOT_READY = new LogMessage(
    "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_NOT_READY",
    "Biometric session not ready (finish status not DONE)",
  );

  static readonly ISSUE_BIOMETRIC_CREDENTIAL_IPV_CORE_MESSAGE_ERROR =
    new LogMessage(
      "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_IPV_CORE_MESSAGE_ERROR",
      "Error sending message to IPV Core",
    );
  static readonly ISSUE_BIOMETRIC_CREDENTIAL_RETRYABLE_ERROR = new LogMessage(
    "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_RETRYABLE_ERROR",
    "Encountered retryable error retrieving biometric session after maximum retries",
  );
  static readonly ISSUE_BIOMETRIC_CREDENTIAL_NON_RETRYABLE_ERROR =
    new LogMessage(
      "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_NON_RETRYABLE_ERROR",
      "Encountered non-retryable error retrieving biometric session",
    );

  static readonly ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT = new LogMessage(
    "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT",
    "SQS Event from vendor processing queue is invalid",
  );

  private constructor(
    public readonly messageCode: string,
    public readonly message: string,
  ) {}

  [key: string]: string; // Index signature needed to implement LogAttributes
}
