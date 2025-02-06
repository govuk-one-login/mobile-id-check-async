export enum SessionState {
  AUTH_SESSION_CREATED = "ASYNC_AUTH_SESSION_CREATED",
  BIOMETRIC_TOKEN_ISSUED = "ASYNC_BIOMETRIC_TOKEN_ISSUED",
}
export type SessionAttributes = BaseSessionAttributes;

export interface BaseSessionAttributes {
  clientId: string;
  govukSigninJourneyId: string;
  createdAt: number;
  issuer: string;
  sessionId: string;
  sessionState: SessionState;
  clientState: string;
  subjectIdentifier: string;
  timeToLive: number;
  redirectUri?: string;
}
