export enum SessionState {
  AUTH_SESSION_CREATED = "ASYNC_AUTH_SESSION_CREATED",
  BIOMETRIC_TOKEN_ISSUED = "ASYNC_BIOMETRIC_TOKEN_ISSUED",
  BIOMETRIC_SESSION_FINISHED = "ASYNC_BIOMETRIC_SESSION_FINISHED",
}

export interface SessionAttributes {
  clientId: string;
  clientState: string;
  createdAt: number;
  govukSigninJourneyId: string;
  issuer: string;
  sessionId: string;
  sessionState: SessionState;
  subjectIdentifier: string;
  timeToLive: number;
  redirectUri?: string;
  documentType?: string
  opaqueId?: string
  biometricSessionId?: string
}

}