type StaticRetainMessages =
  | "Invalid config"
  | "Failed to retrieve biometric viewer key"
  | "Unexpected failure retrieving session from database";

type RetryableErrorMessage =
  | `Retryable error (${number}) retrieving biometric session`
  | `Biometric session not ready: ${string}`;

type RetainMessageOnQueueMessages =
  | StaticRetainMessages
  | RetryableErrorMessage;

export class RetainMessageOnQueue extends Error {
  constructor(message: RetainMessageOnQueueMessages) {
    super(message);
    this.name = "RetainMessageOnQueue";
  }
}
