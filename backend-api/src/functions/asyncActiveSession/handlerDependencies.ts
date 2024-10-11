import { Logger } from "../services/logging/logger";
import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { MessageName, registeredLogs } from "./registeredLogs";
import { ITokenService, TokenService } from "./tokenService/tokenService";
import {
  ISessionService,
  SessionService,
} from "../services/session/sessionService";

export interface IAsyncActiveSessionDependencies {
  env: NodeJS.ProcessEnv;
  logger: () => Logger<MessageName>;
  tokenService: () => ITokenService;
  sessionService: (tableName: string) => ISessionService;
}

export const dependencies: IAsyncActiveSessionDependencies = {
  env: process.env,
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  tokenService: () => new TokenService(),
  sessionService: (tableName: string) => new SessionService(tableName),
};
