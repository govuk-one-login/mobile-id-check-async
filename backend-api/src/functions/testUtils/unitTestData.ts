import { SessionRegistry } from "../common/session/SessionRegistry";
import { UpdateSessionOperation } from "../common/session/updateOperations/UpdateSessionOperation";
import { emptySuccess, Result } from "../utils/result";

export const mockSessionId = "58f4281d-d988-49ce-9586-6ef70a2be0b4";

export const expectedSecurityHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

export const NOW_IN_MILLISECONDS: number = 1704110400000; // 2024-01-01 12:00:00.000

export const mockSessionRegistry: SessionRegistry = {
  async updateSession(
    _sessionId: string,
    _updateOperation: UpdateSessionOperation,
  ): Promise<Result<void>> {
    return emptySuccess();
  },
};
