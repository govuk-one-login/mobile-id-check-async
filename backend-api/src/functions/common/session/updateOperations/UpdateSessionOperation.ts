import { SessionState } from "../session";

type SessionFieldValue = string | number;

export interface UpdateSessionOperation {
  readonly targetState: SessionState;
  readonly eligibleStartingStates: SessionState[];
  getFieldUpdates(): Record<string, SessionFieldValue>;
}
