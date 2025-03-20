import { DocumentType } from "../../types/document";

export enum SessionState {
  AUTH_SESSION_CREATED = "ASYNC_AUTH_SESSION_CREATED",
  BIOMETRIC_TOKEN_ISSUED = "ASYNC_BIOMETRIC_TOKEN_ISSUED",
  BIOMETRIC_SESSION_FINISHED = "ASYNC_BIOMETRIC_SESSION_FINISHED",
}

export type SessionAttributes =
  | BaseSessionAttributes
  | BiometricTokenIssuedSessionAttributes
  | BiometricSessionFinishedAttributes;

export interface BaseSessionAttributes {
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
}

export interface BiometricTokenIssuedSessionAttributes
  extends BaseSessionAttributes {
  documentType: DocumentType;
  opaqueId: string;
  sessionState: SessionState.BIOMETRIC_TOKEN_ISSUED;
}

export interface BiometricSessionFinishedAttributes
  extends BaseSessionAttributes {
  documentType: DocumentType;
  opaqueId: string;
  sessionState: SessionState.BIOMETRIC_SESSION_FINISHED;
  biometricSessionId: string;
}

export function isOlderThan60minutes(createdAtInMilliseconds: number) {
  const SIXTY_MINUTES_IN_MILLISECONDS = 3600000;
  const validFrom = Date.now() - SIXTY_MINUTES_IN_MILLISECONDS;
  return createdAtInMilliseconds < validFrom;
}
