export type AsyncSqsMessages = VendorProccessingMessage;

interface VendorProccessingMessage {
  biometricSessionId: string;
  sessionId: string;
}
