type RetainMessageOnQueueMessages =
  | "Invalid config"
  | "Retrying later";

export class RetainMessageOnQueue extends Error {
  constructor(message: RetainMessageOnQueueMessages) {
    super(message);
    this.name = "RetainMessageOnQueue";
  }
}
