import { AppStartEvent } from "../services/events/types-to-be";

export const getAppStartEvent = (inputs: {
  sessionId: string;
  userId: string;
  issuer: string;
  govukSigninJourneyId: string;
  ipAddress: string;
  redirectUri?: string;
  txmaAuditEncoded?: string;
}): AppStartEvent => {
  const timestampInMillis = Date.now();
  return {
    event_name: "DCMAW_ASYNC_CRI_APP_START",
    user: {
      user_id: inputs.userId,
      session_id: inputs.sessionId,
      ip_address: inputs.ipAddress,
      govuk_signin_journey_id: inputs.govukSigninJourneyId,
    },
    event_timestamp_ms: timestampInMillis,
    timestamp: Math.floor(timestampInMillis / 1000),
    component_id: inputs.issuer,
    extensions: { redirect_uri: inputs.redirectUri },
    restricted: { device_information: { encoded: inputs.txmaAuditEncoded } },
  };
};
