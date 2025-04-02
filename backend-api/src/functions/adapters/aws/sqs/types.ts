export interface VendorProcessingMessage {
  biometricSessionId: string;
  sessionId: string;
}

export interface AbortSessionMessage {
  sub: string;
  state: string;
  error: string;
  error_description: string;
}

export type SQSMessageBody = VendorProcessingMessage | AbortSessionMessage;
