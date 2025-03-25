import { Result } from "../utils/result";
import { SessionAttributes } from "./session";

export interface SessionRegistry {
  createSession(
    sessionAttributes: SessionAttributes,
  ): Promise<Result<void, SessionCreateFailed>>;
}

export enum UpdateSessionError {
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  CONDITIONAL_CHECK_FAILURE = "CONDITIONAL_CHECK_FAILURE",
}

export type SessionCreateFailed =
  | SessionCreateConditionalCheckFailed
  | SessionCreateInternalServerError;

type SessionCreateConditionalCheckFailed = {
  errorType: UpdateSessionError.CONDITIONAL_CHECK_FAILURE;
};
type SessionCreateInternalServerError = {
  errorType:
    | UpdateSessionError.CONDITIONAL_CHECK_FAILURE
    | UpdateSessionError.INTERNAL_SERVER_ERROR;
};
