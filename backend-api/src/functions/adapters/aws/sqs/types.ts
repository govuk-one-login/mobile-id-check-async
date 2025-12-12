export interface VendorProcessingMessage {
  biometricSessionId: string;
  sessionId: string;
}

export interface OutboundQueueErrorMessage {
  sub: string;
  state: string;
  govuk_signin_journey_id: string;
  error: string;
  error_description: string;
}

export interface VerifiableCredentialMessage {
  sub: string;
  state: string;
  "https://vocab.account.gov.uk/v1/credentialJWT": [string];
  govuk_signin_journey_id: string;
}

export interface BackoffRetryDemoMessage {
  sessionId: string;
  pctFailure: number;
  retryState:
    | { delaySec: number; factor: number; triesLeft: number }
    | undefined;
}

export type SQSMessageBody =
  | VendorProcessingMessage
  | OutboundQueueErrorMessage
  | VerifiableCredentialMessage
  | BackoffRetryDemoMessage;
