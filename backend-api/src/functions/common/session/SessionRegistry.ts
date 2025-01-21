import { Result } from "../../utils/result";
import { UpdateSessionOperation } from "./updateOperations/UpdateSessionOperation";

export interface SessionRegistry {
  updateSession(
    sessionId: string,
    updateOperation: UpdateSessionOperation,
  ): Promise<Result<void, UpdateSessionError>>;
}

export enum UpdateSessionError {
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  CONDITIONAL_CHECK_FAILURE = "CONDITIONAL_CHECK_FAILURE",
}
