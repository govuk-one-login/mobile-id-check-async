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

export interface VerifiableCredentialMessage {
  sub: string;
  state: string;
  "https://vocab.account.gov.uk/v1/credentialJWT": [string];
}

export type SQSMessageBody =
  | VendorProcessingMessage
  | OutboundQueueErrorMessage
  | VerifiableCredentialMessage;
