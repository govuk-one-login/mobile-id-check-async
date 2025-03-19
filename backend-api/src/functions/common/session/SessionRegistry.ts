import { Result } from "../../utils/result";
import { GetSessionOperation } from "./getOperations/GetSessionOperation";
import {
  BaseSessionAttributes,
  SessionAttributes,
  SessionState,
} from "./session";
import { UpdateSessionOperation } from "./updateOperations/UpdateSessionOperation";
export interface SessionRegistry {
  updateSession(
    sessionId: string,
    updateOperation: UpdateSessionOperation,
  ): Promise<Result<SessionUpdated, SessionUpdateFailed>>;

  getSession(
    sessionId: string,
    getOperation: GetSessionOperation,
  ): Promise<Result<SessionAttributes, GetSessionFailed>>;
}

// Update session

export interface SessionUpdated {
  attributes: SessionAttributes;
}

export enum UpdateSessionError {
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  CONDITIONAL_CHECK_FAILURE = "CONDITIONAL_CHECK_FAILURE",
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
}

export type SessionUpdateFailed =
  | SessionUpdateFailedConditionalCheckFailure
  | SessionUpdateFailedInternalServerError
  | SessionUpdateFailedSessionNotFound;

interface SessionUpdateFailedConditionalCheckFailure {
  errorType: UpdateSessionError.CONDITIONAL_CHECK_FAILURE;
  attributes: SessionAttributes;
}

export interface SessionUpdateFailedInternalServerError {
  errorType: UpdateSessionError.INTERNAL_SERVER_ERROR;
}

interface SessionUpdateFailedSessionNotFound {
  errorType: UpdateSessionError.SESSION_NOT_FOUND;
}

export type UpdateOperationDataToLog =
  | UpdateExpressionDataToLog
  | UpdateSessionValidateSessionErrorData;

interface UpdateExpressionDataToLog {
  updateExpression: string;
  conditionExpression: string | undefined;
}

export interface UpdateSessionValidateSessionErrorData {
  invalidAttribute:
    | UpdateSessionInvalidSessionAttribute
    | BiometricSessionFinishedInvalidSessionAttribute;
}

interface UpdateSessionInvalidSessionAttribute {
  sessionState?: Exclude<SessionState, SessionState.BIOMETRIC_TOKEN_ISSUED>;
  createdAt?: number;
}

export interface BiometricSessionFinishedValidateSessionErrorData {
  invalidAttribute: BiometricSessionFinishedInvalidSessionAttribute;
}

interface BiometricSessionFinishedInvalidSessionAttribute {
  sessionState?: Exclude<SessionState, SessionState.BIOMETRIC_SESSION_FINISHED>;
  createdAt?: number;
}

// Get session

export enum GetSessionError {
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
  SESSION_INVALID = "SESSION_INVALID",
}

export type GetSessionFailed =
  | GetSessionInternalServerError
  | GetSessionErrorSessionNotFound
  | GetSessionSessionInvalidErrorData;

export interface GetSessionInternalServerError {
  errorType: GetSessionError.INTERNAL_SERVER_ERROR;
}

export interface GetSessionErrorSessionNotFound {
  errorType: GetSessionError.SESSION_NOT_FOUND;
  errorMessage: string;
}

export interface GetSessionSessionInvalidErrorData {
  errorType: GetSessionError.SESSION_INVALID;
  data: GetSessionValidateSessionErrorData;
}

export interface GetSessionValidateSessionErrorData {
  invalidAttribute: ValidateSessionInvalidAttribute;
  sessionAttributes: Partial<BaseSessionAttributes>;
}

export interface ValidateSessionErrorInvalidAttributeData {
  invalidAttribute: ValidateSessionInvalidAttribute;
}

export interface ValidateSessionInvalidAttribute {
  sessionState?: Exclude<SessionState, SessionState.BIOMETRIC_TOKEN_ISSUED>;
  createdAt?: number;
}

// Shared

export interface ValidateSessionAttributes {
  sessionState: SessionState;
  createdAt: number;
}
