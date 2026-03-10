import { VcIssuedTxMAEvent } from "../../../asyncIssueBiometricCredential/getVcIssuedEvent";
import {
  AppStartEvent,
  ClientCredentialsTokenIssuedEvent,
  StartEvent,
} from "../../../common/audit/types";
import { Result } from "../../../utils/result";

export type ISendMessageToSqs = (
  sqsArn: string,
  messageBody: SQSMessageBody,
) => Promise<Result<string | undefined, void>>;

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

export type SQSMessageBody =
  | VcIssuedTxMAEvent
  | AppStartEvent
  | ClientCredentialsTokenIssuedEvent
  | StartEvent
  | VendorProcessingMessage
  | OutboundQueueErrorMessage
  | VerifiableCredentialMessage;
