type RetainMessageOnQueueMessages =
  | "Invalid config"
  | "Failed to retrieve biometric viewer key"
  | "Unexpected failure retrieving session from database";

export class RetainMessageOnQueue extends Error {
  constructor(message: RetainMessageOnQueueMessages) {
    super(message);
    this.name = "RetainMessageOnQueue";
  }
}
