export type SqsMessageBodies = VendorProcessingMessage;

interface VendorProcessingMessage {
  biometricSessionId: string;
  sessionId: string;
}
