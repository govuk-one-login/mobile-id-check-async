export class RetainMessageOnQueue extends Error {
  constructor(message: RetainMessageOnQueueMessages) {
    super(message);
    this.name = "RetainMessageOnQueue";
  }
}

type RetainMessageOnQueueMessages =
  | "Invalid config"
  | "Failed to retrieve biometric viewer key"
  | "Failed to retrieve session from database";
