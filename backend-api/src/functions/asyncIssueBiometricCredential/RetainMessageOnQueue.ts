interface RetainMessageOnQueueConstructor {
  message: RetainMessageOnQueueMessages;
  sessionId?: string;
}

type RetainMessageOnQueueMessages =
  | "Invalid config"
  | "Failed to retrieve biometric viewer key"
  | "Unexpected failure retrieving session from database";

export class RetainMessageOnQueue extends Error {
  private readonly sessionId?: string;

  constructor(params: RetainMessageOnQueueConstructor) {
    const { message, sessionId } = params;

    super(message);
    this.sessionId = sessionId;
    this.name = "RetainMessageOnQueue";
  }
}
