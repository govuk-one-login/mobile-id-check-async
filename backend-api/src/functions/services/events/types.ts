import { Result } from "../../utils/result";
import { DocumentType } from "../../types/document";
import {
  CredentialSubject,
  FailEvidence,
  FlaggedRecord,
  FlagsWrapper,
  PassEvidence,
  TxmaContraIndicator,
} from "@govuk-one-login/mobile-id-check-biometric-credential";

interface BaseEventConfig {
  getNowInMilliseconds: () => number;
  componentId: string;
}

export interface BaseUserEventConfig extends BaseEventConfig {
  sub: string | undefined;
  sessionId: string;
  govukSigninJourneyId: string | undefined;
  ipAddress: string | undefined;
  txmaAuditEncoded: string | undefined;
  transactionId?: string;
}

export interface RestrictedData extends Partial<CredentialSubject> {
  device_information?: {
    encoded: string;
  };
  transactionId?: string;
  flaggedRecord?: FlaggedRecord[];
}

export interface Extensions {
  suspected_fraud_signal?: string;
  redirect_uri?: string;
}

export interface BaseTxmaEvent {
  timestamp: number;
  event_timestamp_ms: number;
  event_name: EventNames;
  component_id: string;
  restricted?: RestrictedData;
}

export interface BaseUserTxmaEvent extends BaseTxmaEvent {
  user: {
    user_id: string | undefined;
    session_id: string;
    govuk_signin_journey_id: string | undefined;
    ip_address: string | undefined;
    transaction_id?: string;
  };
}

export type GenericEventNames =
  | "DCMAW_ASYNC_CRI_START"
  | "DCMAW_ASYNC_CRI_4XXERROR"
  | "DCMAW_ASYNC_CRI_5XXERROR"
  | "DCMAW_ASYNC_CRI_ERROR"
  | "DCMAW_ASYNC_CRI_END"
  | "DCMAW_ASYNC_APP_END"
  | "DCMAW_ASYNC_ABORT_APP"
  | "DCMAW_ASYNC_CRI_VC_ISSUED";

export const txmaBillingEventNames = [
  "DCMAW_ASYNC_HYBRID_BILLING_STARTED",
  "DCMAW_ASYNC_IPROOV_BILLING_STARTED",
  "DCMAW_ASYNC_READID_NFC_BILLING_STARTED",
] as const;

export type TxmaBillingEventName = (typeof txmaBillingEventNames)[number];

export type EventNames =
  | GenericEventNames
  | TxmaBillingEventName
  | "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED"
  | "DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED";

export type VcIssuedEvidence = (PassEvidence | FailEvidence) & {
  txmaContraIndicators: TxmaContraIndicator[];
};

export interface GenericEventConfig extends BaseUserEventConfig {
  eventName: GenericEventNames | TxmaBillingEventName;
  redirect_uri: string | undefined;
  suspected_fraud_signal: string | undefined;
  evidence?: VcIssuedEvidence[];
  credentialSubject?: CredentialSubject;
  clientId?: string;
  flags?: FlagsWrapper;
  flaggedRecord?: FlaggedRecord[];
}
export interface CredentialTokenIssuedEventConfig extends BaseEventConfig {
  eventName: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED";
}

export interface BiometricTokenIssuedEventConfig extends BaseUserEventConfig {
  documentType: DocumentType;
  redirect_uri: string | undefined;
}

export interface GenericTxmaEvent extends BaseUserTxmaEvent {
  event_name: EventNames;
  client_id?: string;
  extensions: Extensions | undefined;
}

export interface CredentialTokenIssuedEvent extends BaseTxmaEvent {
  event_name: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED";
}

export interface BiometricTokenIssuedEvent extends BaseUserTxmaEvent {
  event_name: "DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED";
  extensions: {
    documentType: DocumentType;
  };
}

export type TxmaEvents =
  | GenericTxmaEvent
  | CredentialTokenIssuedEvent
  | BiometricTokenIssuedEvent;

export interface IEventService {
  writeCredentialTokenIssuedEvent: (
    eventConfig: CredentialTokenIssuedEventConfig,
  ) => Promise<Result<void, void>>;
  writeGenericEvent: (
    eventConfig: GenericEventConfig,
  ) => Promise<Result<void, void>>;
  writeBiometricTokenIssuedEvent: (
    eventConfig: BiometricTokenIssuedEventConfig,
  ) => Promise<Result<void, void>>;
}
