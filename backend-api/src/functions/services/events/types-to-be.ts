import { Result } from "../../utils/result";
import { DocumentType } from "../../types/document";

type AsyncPrefix = "DCMAW_ASYNC";
type EventNameShortHand =
  | "CLIENT_CREDENTIALS_TOKEN_ISSUED"
  | "CRI_START"
  | "CRI_4XXERROR"
  | "CRI_5XXERROR"
  | "CRI_ERROR"
  | "CRI_END"
  | "CRI_APP_START"
  | "BIOMETRIC_TOKEN_ISSUED"
  | "APP_END" // inconsistently named when designing the event. Changing this requires updating the event catalogue and likely changes to event consumers
  | "ABORT_APP" // inconsistently named when designing the event. Changing this requires updating the event catalogue and likely changes to event consumers
  | "HYBRID_BILLING_STARTED"
  | "IPROOV_BILLING_STARTED"
  | "READID_NFC_BILLING_STARTED";

export type EventNames = `${AsyncPrefix}_${EventNameShortHand}`;

type GenericEventNames = GenericEvents["event_name"];

interface BaseEvent<T extends EventNames> {
  timestamp: number;
  event_timestamp_ms: number;
  event_name: T;
  component_id: string;
}

interface User {
  user_id: string;
  session_id: string;
  govuk_signin_journey_id: string;
  ip_address?: string;
}

export interface Restricted_DeviceInformation {
  device_information: {
    encoded: string;
  };
}
interface Extensions_FraudSignal {
  suspected_fraud_signal?: string;
}

interface Extensions_RedirectUri {
  redirect_uri?: string;
}

export type ClientCredentialsTokenIssuedEvent =
  BaseEvent<"DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED">;

export type ErrorEvent = BaseEvent<
  "DCMAW_ASYNC_CRI_4XXERROR" | "DCMAW_ASYNC_CRI_5XXERROR"
> & { user: User } & {
  extensions?: Extensions_FraudSignal & Extensions_RedirectUri;
} & { restricted?: Restricted_DeviceInformation };

export type StartEvent = BaseEvent<"DCMAW_ASYNC_CRI_START"> & { user: User } & {
  extensions?: Extensions_RedirectUri;
};

export type AppStartEvent = BaseEvent<"DCMAW_ASYNC_CRI_APP_START"> & {
  user: Required<User>;
} & {
  extensions?: Extensions_RedirectUri;
} & { restricted?: Restricted_DeviceInformation };

type AppEndEventEvent = BaseEvent<"DCMAW_ASYNC_APP_END"> & {
  user: Required<User>;
} & {
  extensions?: Extensions_RedirectUri;
} & { restricted?: Restricted_DeviceInformation };

export type EndEvent = BaseEvent<"DCMAW_ASYNC_CRI_END"> &
  User & {
    extensions?: Extensions_RedirectUri;
  };

type AbortAppEvent = BaseEvent<"DCMAW_ASYNC_ABORT_APP"> & {
  user: Required<User>;
} & {
  extensions?: Extensions_RedirectUri;
} & { restricted?: Restricted_DeviceInformation };

type BillingEvents = BaseEvent<
  | "DCMAW_ASYNC_HYBRID_BILLING_STARTED"
  | "DCMAW_ASYNC_READID_NFC_BILLING_STARTED"
  | "DCMAW_ASYNC_IPROOV_BILLING_STARTED"
> & { user: Required<User> } & { extensions?: Extensions_RedirectUri } & {
  restricted: Restricted_DeviceInformation;
};

export type BiometricTokenIssuedEvent =
  BaseEvent<"DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED"> & {
    user: Required<User>;
  } & {
    extensions: Extensions_RedirectUri & {
      opaque_id: string;
      documentType: DocumentType;
    };
  } & { restricted: Restricted_DeviceInformation };

export type GenericEvents = StartEvent;
// | AppStartEvent
// | AppEndEventEvent
// | AbortAppEvent
// | EndEvent

export type TxmaEvents =
  | ErrorEvent
  | StartEvent
  | AppStartEvent
  | AppEndEventEvent
  | EndEvent
  | AbortAppEvent
  | BillingEvents
  | ClientCredentialsTokenIssuedEvent
  | BiometricTokenIssuedEvent;

export type TxmaBillingEventNames = Pick<BillingEvents, "event_name">;

//types for function parameters used in EventService.ts

interface BaseEventConfig {
  getNowInMilliseconds: () => number;
  componentId: string;
}

export interface ErrorEventConfig {
  getNowInMilliseconds: () => number;
  componentId: string;
  sub: string;
  sessionId: string;
  govukSigninJourneyId: string;
  ipAddress: string | undefined;
  txmaAuditEncoded: string;
  eventName: ErrorEvent["event_name"];
  redirect_uri: string | undefined;
}

export interface BaseUserEventConfig extends BaseEventConfig {
  sub: string;
  sessionId: string;
  govukSigninJourneyId: string;
  ipAddress: string;
  txmaAuditEncoded: string;
  transactionId?: string;
}

export interface GenericEventConfig extends BaseUserEventConfig {
  eventName: GenericEventNames;
  redirect_uri: string | undefined;
  suspected_fraud_signal: string | undefined;
}

export interface CredentialTokenIssuedEventConfig extends BaseEventConfig {
  eventName: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED";
}

export type BiometricTokenIssuedEventConfig = Required<BaseUserEventConfig> & {
  documentType: DocumentType;
  redirect_uri: string | undefined;
  opaqueId: string;
  sub: string;
  sessionId: string;
  govukSigninJourneyId: string;
  ipAddress: string;
  txmaAuditEncoded: string;
  transactionId: string;
};

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
