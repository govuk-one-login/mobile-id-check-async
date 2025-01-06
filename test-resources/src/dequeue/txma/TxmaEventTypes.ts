import { Flags, VerifiedCredential } from "./IVerifiedCredential";

export const TXMA_HEADER = "txma-audit-encoded";

export type EncodedHeader = string | string[] | undefined;
export type IpAddress = string | string[];

export interface TxmaUser {
  user_id: string;
  transaction_id: string;
  session_id: string;
  govuk_signin_journey_id: string;
  ip_address?: string | string[];
  deviceId?: string;
}

export interface TxmaDeviceInfo {
  deviceInfo: {
    brand: string | null;
    manufacturer: string | null;
    model: string | null;
    OSVersion: string | null;
    platform: string | null;
    timestamp: string | null;
  };
}

export type AbortTxmaEventName = "DCMAW_ABORT_APP" | "DCMAW_ABORT_WEB";

type ErrorTxmaEventName = "DCMAW_CRI_4XXERROR" | "DCMAW_CRI_5XXERROR";

type RedirectTxmaEventName =
  | "DCMAW_REDIRECT_SUCCESS"
  | "DCMAW_REDIRECT_ABORT"
  | "DCMAW_MISSING_CONTEXT_AFTER_ABORT"
  | "DCMAW_MISSING_CONTEXT_AFTER_COMPLETION";

export type DocumentSelectedTxmaEventName =
  | "DCMAW_PASSPORT_SELECTED"
  | "DCMAW_BRP_SELECTED"
  | "DCMAW_DRIVING_LICENCE_SELECTED";

export type GenericTxmaEventName =
  | ErrorTxmaEventName
  | "DCMAW_CRI_END"
  | "DCMAW_CRI_ABORT";

export type AppHandoffTxmaEventName = "DCMAW_APP_HANDOFF_START";

export type BillingTxmaEventName =
  | "DCMAW_HYBRID_BILLING_STARTED"
  | "DCMAW_IPROOV_BILLING_STARTED"
  | "DCMAW_READID_NFC_BILLING_STARTED";

export type UserInteractionTxmaEventName =
  | AppHandoffTxmaEventName
  | BillingTxmaEventName
  | AbortTxmaEventName
  | ErrorTxmaEventName
  | DocumentSelectedTxmaEventName
  | RedirectTxmaEventName
  | "DCMAW_CRI_START"
  | "DCMAW_APP_END";

export interface GenericTxmaEvent {
  event_name: GenericTxmaEventName;
  user: TxmaUser;
  client_id: string;
  timestamp: number;
  event_timestamp_ms: number;
  component_id: string;
}

export interface UserInteractionTxmaEvent {
  event_name: UserInteractionTxmaEventName;
  user: TxmaUser;
  client_id: string;
  timestamp: number;
  event_timestamp_ms: number;
  component_id: string;
  restricted?: {
    device_information: {
      encoded: string | string[];
    };
  };
}

export interface SessionRecoveredTxmaEvent {
  event_name: "DCMAW_SESSION_RECOVERED";
  user: TxmaUser;
  client_id: string;
  timestamp: number;
  event_timestamp_ms: number;
  component_id: string;
  extensions: {
    previous_govuk_signin_journey_id: string;
  };
  restricted?: {
    device_information: {
      encoded: string | string[];
    };
  };
}

export interface AppStartTxmaEvent {
  event_name: "DCMAW_APP_START";
  user: TxmaUser;
  extensions: {
    opaque_id: string;
  };
  client_id: string;
  timestamp: number;
  event_timestamp_ms: number;
  component_id: string;
  restricted?: {
    device_information: {
      encoded: string | string[];
    };
  };
}

export type UserInteractionSuspectedFraudSignal = "AUTH_SESSION_TOO_OLD";

export interface UserInteractionCri4xxSuspectedFraudTxmaEvent {
  event_name: "DCMAW_CRI_4XXERROR";
  client_id: string;
  component_id: string;
  event_timestamp_ms: number;
  timestamp: number;
  user: TxmaUser;
  extensions: {
    suspected_fraud_signal: UserInteractionSuspectedFraudSignal;
  };
  restricted?: {
    device_information: {
      encoded: string | string[];
    };
  };
}

export type SuspectedFraudSignal =
  | "BIOMETRIC_SESSION_OLDER_THAN_AUTH_SESSION"
  | "BIOMETRIC_SESSION_OPAQUEID_MISMATCH";

export interface Cri4xxSuspectedFraudTxmaEvent {
  event_name: "DCMAW_CRI_4XXERROR";
  client_id: string;
  component_id: string;
  event_timestamp_ms: number;
  timestamp: number;
  user: TxmaUser;
  extensions: {
    suspected_fraud_signal: SuspectedFraudSignal;
  };
}

export interface VcIssuedTxmaEvent {
  event_name: "DCMAW_CRI_VC_ISSUED";
  user: TxmaUser;
  client_id: string;
  timestamp: number;
  event_timestamp_ms: number;
  component_id: string;
  restricted: VerifiedCredential["credentialSubject"];
  extensions: {
    evidence: VerifiedCredential["evidence"];
    dcmawFlagsPassport?: Flags;
    dcmawFlagsDL?: Flags;
    dcmawFlagsBRP?: Flags;
  };
  platform: TxmaDeviceInfo[];
}

export type TxmaEvent =
  | GenericTxmaEvent
  | UserInteractionTxmaEvent
  | SessionRecoveredTxmaEvent
  | AppStartTxmaEvent
  | VcIssuedTxmaEvent;

const genericTxmaEvent = {
  event_name: "MOCK_EVENT_NAME",
  user: {
    user_id: "mockUserId",
    transaction_id: "mockTransactionId",
    session_id: "mockSessionId",
    govuk_signin_journey_id: "mockJourneyId",
  },
  client_id: "mockClientId",
  timestamp: "mockTimestamp",
  event_timestamp_ms: "mockTimestampMs",
  component_id: "mockComponentId",
};
