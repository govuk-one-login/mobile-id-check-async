import { LogAttributes } from "@aws-lambda-powertools/logger/types";

export class LogMessage implements LogAttributes {
  // STS mock
  static readonly STS_MOCK_STARTED = new LogMessage(
    "TEST_RESOURCES_STS_MOCK_STARTED",
    "Lambda handler processing has started.",
  );
  static readonly STS_MOCK_INVALID_CONFIG = new LogMessage(
    "TEST_RESOURCES_STS_MOCK_INVALID_CONFIG",
    "One or more required environment variables were missing or invalid.",
  );
  static readonly STS_MOCK_REQUEST_BODY_INVALID = new LogMessage(
    "TEST_RESOURCES_STS_MOCK_REQUEST_BODY_INVALID",
    "The incoming request body was missing or invalid.",
  );
  static readonly STS_MOCK_FAILURE_RETRIEVING_SIGNING_KEY = new LogMessage(
    "TEST_RESOURCES_STS_MOCK_FAILURE_RETRIEVING_SIGNING_KEY",
    "An unexpected failure occurred while trying to retrieve the signing key from S3.",
  );
  static readonly STS_MOCK_FAILURE_SIGNING_TOKEN = new LogMessage(
    "TEST_RESOURCES_STS_MOCK_FAILURE_SIGNING_TOKEN",
    "An unexpected failure occurred while trying to sign the token.",
  );
  static readonly STS_MOCK_FAILURE_ENCRYPTING_TOKEN = new LogMessage(
    "TEST_RESOURCES_STS_MOCK_FAILURE_ENCRYPTING_TOKEN",
    "An unexpected failure occurred while trying to encrypt the token.",
  );
  static readonly STS_MOCK_COMPLETED = new LogMessage(
    "TEST_RESOURCES_STS_MOCK_COMPLETED",
    "Lambda handler processing has completed successfully.",
  );

  // Dequeue Events
  static readonly DEQUEUE_EVENTS_STARTED = new LogMessage(
    "TEST_RESOURCES_DEQUEUE_EVENTS_STARTED",
    "Lambda handler processing has started.",
  );
  static readonly DEQUEUE_EVENTS_INVALID_CONFIG = new LogMessage(
    "TEST_RESOURCES_DEQUEUE_EVENTS_INVALID_CONFIG",
    "One or more required environment variables were missing or invalid.",
  );
  static readonly DEQUEUE_EVENTS_FAILURE_PROCESSING_MESSAGE = new LogMessage(
    "TEST_RESOURCES_DEQUEUE_EVENTS_FAILURE_PROCESSING_MESSAGE",
    "Failed to process message",
  );
  static readonly DEQUEUE_EVENTS_FAILURE_WRITING_TO_DATABASE = new LogMessage(
    "TEST_RESOURCES_DEQUEUE_EVENTS_FAILURE_WRITING_TO_DATABASE",
    "Failed to put event into DynamoDB.",
  );
  static readonly DEQUEUE_EVENTS_PROCESSED_MESSAGES = new LogMessage(
    "TEST_RESOURCES_DEQUEUE_EVENTS_PROCESSED_MESSAGES",
    "Successfully processed messages",
  );
  static readonly DEQUEUE_EVENTS_COMPLETED = new LogMessage(
    "TEST_RESOURCES_DEQUEUE_EVENTS_COMPLETED",
    "Lambda handler processing has completed successfully.",
  );

  // Dequeue credential result
  static readonly DEQUEUE_CREDENTIAL_RESULT_STARTED = new LogMessage(
    "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_STARTED",
    "Lambda handler processing has started.",
  );
  static readonly DEQUEUE_CREDENTIAL_RESULT_MESSAGE_INVALID = new LogMessage(
    "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_MESSAGE_INVALID",
    "Credential result message is missing or invalid",
  );
  static readonly DEQUEUE_CREDENTIAL_RESULT_PROCESSED_MESSAGES = new LogMessage(
    "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_PROCESSED_MESSAGES",
    "Successfully processed messages",
  );
  static readonly DEQUEUE_CREDENTIAL_RESULT_COMPLETED = new LogMessage(
    "TEST_RESOURCES_DEQUEUE_CREDENTIAL_RESULT_COMPLETED",
    "Lambda handler processing has completed successfully.",
  );

  // Put session
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
