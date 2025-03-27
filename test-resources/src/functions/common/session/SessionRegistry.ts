import { Result } from "../utils/result";
import { SessionAttributes } from "./session";

export interface SessionRegistry {
  createSession(
    sessionAttributes: SessionAttributes,
  ): Promise<Result<void, void>>;
}