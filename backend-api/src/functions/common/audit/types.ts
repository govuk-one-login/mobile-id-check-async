type AsyncPrefix = "DCMAW_ASYNC";
type EventNameShortHand =
  | "CLIENT_CREDENTIALS_TOKEN_ISSUED"
  | "CRI_START"
  | "CRI_APP_START";

export type EventNames = `${AsyncPrefix}_${EventNameShortHand}`;

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
    encoded: string | undefined;
  };
}

interface Extensions_RedirectUri {
  redirect_uri?: string;
}

export type ClientCredentialsTokenIssuedEvent =
  BaseEvent<"DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED">;

export type StartEvent = BaseEvent<"DCMAW_ASYNC_CRI_START"> & { user: User } & {
  extensions?: Extensions_RedirectUri;
};

export type AppStartEvent = BaseEvent<"DCMAW_ASYNC_CRI_APP_START"> & {
  user: Required<User>;
} & {
  extensions?: Extensions_RedirectUri;
} & { restricted: Restricted_DeviceInformation };
