export type IdCheckSqsMessages = VendorProccessingMessage;

interface VendorProccessingMessage {
  biometricSessionId: string;
  sessionId: string;
}
