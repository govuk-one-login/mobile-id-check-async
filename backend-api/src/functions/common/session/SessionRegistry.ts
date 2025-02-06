import { SessionAttributes } from "./session";
import { Result } from "../../utils/result";
import { UpdateSessionOperation } from "./updateOperations/UpdateSessionOperation";

export interface SessionRegistry {
  updateSession(
    sessionId: string,
    updateOperation: UpdateSessionOperation,
  ): Promise<Result<UpdateSessionSuccess, UpdateSessionFailure>>;
}

export interface UpdateSessionSuccess {
  attributes: SessionAttributes;
}

export type UpdateSessionFailure =
  | UpdateSessionFailureConditionalCheckFailure
  | UpdateSessionFailureInternalServerError
  | UpdateSessionFailureSessionNotFound;

export interface UpdateSessionFailureConditionalCheckFailure {
  errorType: UpdateSessionError.CONDITIONAL_CHECK_FAILURE;
  attributes: SessionAttributes;
}

export interface UpdateSessionFailureInternalServerError {
  errorType: UpdateSessionError.INTERNAL_SERVER_ERROR;
}

export interface UpdateSessionFailureSessionNotFound {
  errorType: UpdateSessionError.SESSION_NOT_FOUND;
}

export enum UpdateSessionError {
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  CONDITIONAL_CHECK_FAILURE = "CONDITIONAL_CHECK_FAILURE",
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
}
