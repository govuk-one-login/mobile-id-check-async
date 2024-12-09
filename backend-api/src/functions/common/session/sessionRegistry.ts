import { IUpdateSessionOperation, Session, SessionState } from "./Session";
import { Result } from "../../utils/result";
import { CreateSessionAttributes } from "../../services/session/sessionService";
import {
  DatabaseRecord,
  ReadSessionError,
} from "../../adapters/dynamoDbAdapter";

export interface SessionRegistry {
  getSessionWithState(
    sessionId: string,
    sessionState: SessionState,
  ): Promise<Result<Session, ReadSessionError>>;

  // Ideally the return value of this would be more dynamo-agnostic, to keep it in this interface
  getActiveSession(
    subjectIdentifier: string,
    attributesToGet: string[],
  ): Promise<DatabaseRecord | null>;

  createSession(
    attributes: CreateSessionAttributes,
    sessionId: string,
  ): Promise<void>;

  updateSession(
    sessionId: string,
    updateOperation: IUpdateSessionOperation,
  ): Promise<Result<void>>;
}
