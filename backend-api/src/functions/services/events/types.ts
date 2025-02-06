import { Result } from "../../utils/result";

interface BaseEventConfig {
  getNowInMilliseconds: () => number;
  componentId: string;
  eventName: EventNames;
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
    transaction_id: string | undefined;
    session_id: string;
    govuk_signin_journey_id: string | undefined;
  };
}

export type GenericEventName =
  | "DCMAW_ASYNC_CRI_START"
  | "DCMAW_ASYNC_CRI_4XXERROR";

export type EventNames =
  | GenericEventName
  | "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED";

export interface GenericEventConfig extends BaseUserEventConfig {
  eventName: GenericEventName;
}

export interface CredentialTokenIssuedEventConfig extends BaseEventConfig {
  eventName: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED";
}

export interface GenericTxmaEvent extends BaseUserTxmaEvent {
  event_name: GenericEventName;
}

export interface CredentialTokenIssuedEvent extends BaseTxmaEvent {
  event_name: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED";
}

export interface IEventService {
  writeCredentialTokenIssuedEvent: (
    eventConfig: CredentialTokenIssuedEventConfig,
  ) => Promise<Result<null>>;
  writeGenericEvent: (eventConfig: GenericEventConfig) => Promise<Result<null>>;
}
