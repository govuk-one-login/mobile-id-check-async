export enum SessionState {
  AUTH_SESSION_CREATED = 'ASYNC_AUTH_SESSION_CREATED',
  BIOMETRIC_TOKEN_ISSUED = 'ASYNC_BIOMETRIC_TOKEN_ISSUED',
  BIOMETRIC_SESSION_FINISHED = 'ASYNC_BIOMETRIC_SESSION_FINISHED',
  RESULT_SENT = "ASYNC_RESULT_SENT",
}

type CommonSessionKeys = {
  sessionId: string,
  createdAt: number,
  timeToLive: number,
  clientId: string,
  govukSigninJourneyId: string,
  issuer: string,
  clientState: string,
  subjectIdentifier: string,
  redirectUri?: string
}

export type AuthSessionCreatedSession = CommonSessionKeys & {
  sessionState: SessionState.AUTH_SESSION_CREATED
}

export type BiometricTokenIssuedSession = CommonSessionKeys & {
  sessionState: SessionState.BIOMETRIC_TOKEN_ISSUED,
  documentType: string,
  accessToken: string,
  opaqueId: string,
}

export type BiometricSessionFinishedSession = CommonSessionKeys & {
  sessionState: SessionState.BIOMETRIC_SESSION_FINISHED,
  documentType: string,
  accessToken: string,
  opaqueId: string,
  biometricSessionId: string
}

export type ResultSentSession = CommonSessionKeys & {
  sessionState: SessionState.RESULT_SENT,
  documentType: string,
  accessToken: string,
  opaqueId: string,
  biometricSessionId: string
}

export type Session = AuthSessionCreatedSession
  | BiometricTokenIssuedSession
  | BiometricSessionFinishedSession
  | ResultSentSession
