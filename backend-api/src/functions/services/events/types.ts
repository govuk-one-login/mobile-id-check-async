import { Result } from "../../utils/result";
import { DocumentType } from "../../types/document";

interface BaseEventConfig {
  getNowInMilliseconds: () => number;
  componentId: string;
}

export interface BaseUserEventConfig extends BaseEventConfig {
  sub: string | undefined;
  sessionId: string;
  govukSigninJourneyId: string | undefined;
}

export interface BaseTxmaEvent {
  timestamp: number;
  event_timestamp_ms: number;
  event_name: EventNames;
  component_id: string;
}

export interface BaseUserTxmaEvent extends BaseTxmaEvent {
  user: {
    user_id: string | undefined;
    session_id: string;
    govuk_signin_journey_id: string | undefined;
  };
}

export type GenericEventNames =
  | "DCMAW_ASYNC_CRI_START"
  | "DCMAW_ASYNC_CRI_4XXERROR"
  | "DCMAW_ASYNC_CRI_5XXERROR";

export type EventNames =
  | GenericEventNames
  | "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED"
  | "DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED";

export interface GenericEventConfig extends BaseUserEventConfig {
  eventName: GenericEventNames;
}

export interface CredentialTokenIssuedEventConfig extends BaseEventConfig {
  eventName: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED";
}

export interface BiometricTokenIssuedEventConfig extends BaseUserEventConfig {
  documentType: DocumentType;
}

export interface GenericTxmaEvent extends BaseUserTxmaEvent {
  event_name: GenericEventNames;
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
