import { StartEvent } from "../services/events/types-to-be";

export const getCriStartTxmaEvent = (inputs: {
  sessionId: string;
  userId: string;
  issuer: string;
  govukSigninJourneyId: string;
  redirectUri?: string;
}): StartEvent => {
  const timeInMillis = Date.now();
  return {
    event_name: "DCMAW_ASYNC_CRI_START",
    component_id: inputs.issuer,
    user: {
      user_id: inputs.userId,
      govuk_signin_journey_id: inputs.govukSigninJourneyId,
      session_id: inputs.sessionId,
    },
    timestamp: Math.floor(timeInMillis / 1000),
    event_timestamp_ms: timeInMillis,
    extensions: { redirect_uri: inputs.redirectUri },
  };
};
