import { Result } from "../../utils/result";
import { GetSessionOperation } from "./getOperations/GetSessionOperation";
import {
  BiometricTokenIssuedSessionAttributes,
  SessionAttributes,
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
  ): Promise<Result<SessionAttributes, SessionRetrievalFailed>>;
}

export interface SessionUpdated {
  attributes: SessionAttributes;
}

export type SessionUpdateFailed =
  | SessionUpdateFailedConditionalCheckFailure
  | SessionUpdateFailedInternalServerError
  | SessionUpdateFailedSessionNotFound;

export interface SessionUpdateFailedConditionalCheckFailure {
  errorType: UpdateSessionError.CONDITIONAL_CHECK_FAILURE;
  attributes: SessionAttributes;
}

export interface SessionUpdateFailedInternalServerError {
  errorType: UpdateSessionError.INTERNAL_SERVER_ERROR;
}

export interface SessionUpdateFailedSessionNotFound {
  errorType: UpdateSessionError.SESSION_NOT_FOUND;
}

export enum UpdateSessionError {
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  CONDITIONAL_CHECK_FAILURE = "CONDITIONAL_CHECK_FAILURE",
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
}

export interface UpdateExpressionDataToLog {
  updateExpression: string;
  conditionExpression: string | undefined;
}

export type SessionRetrievalFailed =
  | SessionRetrievalFailedInternalServerError
  | SessionRetrievalFailedSessionNotFound;

export interface SessionRetrievalFailedInternalServerError {
  errorType: GetSessionError.INTERNAL_SERVER_ERROR;
}

export interface SessionRetrievalFailedSessionNotFound {
  errorType: GetSessionError.SESSION_NOT_FOUND;
  session: Partial<BiometricTokenIssuedSessionAttributes> | string;
}

export enum GetSessionError {
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
}
