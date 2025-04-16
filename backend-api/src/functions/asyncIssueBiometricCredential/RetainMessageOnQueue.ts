type StaticRetainMessages =
  | "Invalid config"
  | "Failed to retrieve biometric viewer key"
  | "Unexpected failure retrieving session from database";

type RetryableErrorMessages =
  `Retryable error (${number | string}) retrieving biometric session`;
type NonErrorMessages = `Biometric session not ready: ${string}`;

type RetainMessageOnQueueMessages =
  | StaticRetainMessages
  | RetryableErrorMessages
  | NonErrorMessages;

export class RetainMessageOnQueue extends Error {
  constructor(message: RetainMessageOnQueueMessages) {
    super(message);
    this.name = "RetainMessageOnQueue";
  }
}
