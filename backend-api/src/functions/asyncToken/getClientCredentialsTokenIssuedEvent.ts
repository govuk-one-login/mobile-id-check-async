import { ClientCredentialsTokenIssuedEvent } from "../services/events/types-to-be";

export const getClientCredentialsTokenIssuedTxmaEvent = (
  componentId: string,
): ClientCredentialsTokenIssuedEvent => {
  const timeInMillis = Date.now();
  return {
    event_name: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
    component_id: componentId,
    event_timestamp_ms: timeInMillis,
    timestamp: Math.floor(timeInMillis / 1000),
  };
};
