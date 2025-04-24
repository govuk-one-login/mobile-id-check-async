export interface VendorProcessingMessage {
  biometricSessionId: string;
  sessionId: string;
}

export interface OutboundQueueErrorMessage {
  sub: string;
  state: string;
  error: string;
  error_description: string;
}

export type SQSMessageBody =
  | VendorProcessingMessage
  | OutboundQueueErrorMessage;
