type RetainMessageOnQueueMessages =
  | "Invalid config"
  | "Failed to retrieve biometric viewer key"
  | "Unexpected failure retrieving session from database"
  | "Retryable error retrieving biometric session"
  | `Biometric session not ready: ${string}`
  | "Unexpected failure writing the VC to the IPVCore outbound queue";

export class RetainMessageOnQueue extends Error {
  constructor(message: RetainMessageOnQueueMessages) {
    super(message);
    this.name = "RetainMessageOnQueue";
  }
}
