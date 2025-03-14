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

interface CommonSessionAttributes {
  clientId: string;
  clientState: string;
  createdAt: number;
  govukSigninJourneyId: string;
  issuer: string;
  sessionId: string;
  subjectIdentifier: string;
  timeToLive: number;
  redirectUri?: string;
}

export interface BaseSessionAttributes extends CommonSessionAttributes {
  sessionState: SessionState;
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
