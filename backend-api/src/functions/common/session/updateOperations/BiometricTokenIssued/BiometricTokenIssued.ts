import { UpdateSessionOperation } from "../UpdateSessionOperation";
import { DocumentType } from "../../../../types/document";
import { SessionState } from "../../session";

export class BiometricTokenIssued implements UpdateSessionOperation {
  constructor(
    private readonly documentType: DocumentType,
    private readonly opaqueId: string,
  ) {}

  readonly targetState = SessionState.BIOMETRIC_TOKEN_ISSUED;

  readonly eligibleStartingStates = [SessionState.AUTH_SESSION_CREATED];

  getFieldUpdates() {
    return {
      documentType: this.documentType,
      opaqueId: this.opaqueId,
    };
  }
}
