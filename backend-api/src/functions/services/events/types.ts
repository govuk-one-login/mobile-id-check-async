import { Result } from "../../utils/result";

interface BaseEventConfig {
  getNowInMilliseconds: () => number;
  componentId: string;
  eventName: EventNames;
}

export interface BaseUserEventConfig extends BaseEventConfig {
  sub: string;
  sessionId: string;
  govukSigninJourneyId: string;
}

export interface BaseTxmaEvent {
  timestamp: number;
  event_name: EventNames;
  component_id: string;
}

export interface BaseUserTxmaEvent extends BaseTxmaEvent {
  user: {
    user_id: string;
    transaction_id: string;
    session_id: string;
    govuk_signin_journey_id: string;
  };
}

export type GenericEventName = "DCMAW_ASYNC_CRI_START";
export type EventNames =
  | GenericEventName
  | "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED"
  | "DCMAW_ASYNC_CRI_4XXERROR"
  | "DCMAW_ASYNC_CRI_5XXERROR"
  | "DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED";

export interface GenericEventConfig extends BaseUserEventConfig {
  eventName: GenericEventName;
}

export interface CredentialTokenIssuedEventConfig extends BaseEventConfig {
  eventName: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED";
}

export interface CriErrorEventConfig extends BaseUserEventConfig {
  eventName: "DCMAW_ASYNC_CRI_4XXERROR";
}

export interface BiometricTokenIssuedEventConfig extends BaseUserEventConfig {
  eventName: "DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED";
  documentType: string;
}

export interface GenericTxmaEvent extends BaseUserTxmaEvent {
  event_name: GenericEventName;
}

export interface CredentialTokenIssuedEvent extends BaseTxmaEvent {
  event_timestamp_ms: number;
  event_name: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED";
}

export interface CriErrorTxmaEvent extends BaseUserTxmaEvent {
  event_timestamp_ms: number;
  event_name: "DCMAW_ASYNC_CRI_4XXERROR";
}

export interface BiometricTokenIssuedEvent extends BaseUserTxmaEvent {
  event_name: "DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED";
  documentType: string;
  event_timestamp_ms: number;
}

export interface IEventService {
  writeCredentialTokenIssuedEvent: (
    eventConfig: CredentialTokenIssuedEventConfig,
  ) => Promise<Result<null>>;
  writeGenericEvent: (eventConfig: GenericEventConfig) => Promise<Result<null>>;
  writeCriErrorEvent: (
    eventConfig: CriErrorEventConfig,
  ) => Promise<Result<null>>;
}
