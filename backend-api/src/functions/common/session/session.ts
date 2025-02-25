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

export interface BiometricTokenIssuedSessionAttributes
  extends BaseSessionAttributes {
  sessionState: SessionState.BIOMETRIC_TOKEN_ISSUED;
  documentType: DocumentType;
  opaqueId: string;
}

export interface BiometricSessionFinishedAttributes
  extends BaseSessionAttributes {
  sessionState: SessionState.BIOMETRIC_SESSION_FINISHED;
  documentType: DocumentType;
  opaqueId: string;
  biometricSessionId: string;
}
