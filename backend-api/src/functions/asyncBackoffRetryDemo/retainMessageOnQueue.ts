type RetainMessageOnQueueMessages =
  | "Invalid config"
  | "Retry later";

export class RetainMessageOnQueue extends Error {
  constructor(message: RetainMessageOnQueueMessages) {
    super(message);
    this.name = "RetainMessageOnQueue";
  }
}
