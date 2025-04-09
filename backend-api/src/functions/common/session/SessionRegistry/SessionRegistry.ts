import { Result } from "../../../utils/result";
import { GetSessionOperation } from "../getOperations/GetSessionOperation";
import { SessionAttributes } from "../session";
import { UpdateSessionOperation } from "../updateOperations/UpdateSessionOperation";
import { GetSessionFailed, SessionUpdated, SessionUpdateFailed } from "./types";

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
