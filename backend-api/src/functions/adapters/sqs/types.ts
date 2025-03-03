export type AsyncSqsMessages = VendorProcessingMessage;

interface VendorProcessingMessage {
  biometricSessionId: string;
  sessionId: string;
}
