import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { Logger } from "../services/logging/logger";
import {
  ISessionService,
  SessionService,
} from "../services/session/sessionService";
import { MessageName, registeredLogs } from "./registeredLogs";
import { PublicKeyGetter } from "./tokenService/publicKeyGetter";
import {
  ITokenService,
  ITokenServiceDependencies,
  TokenService,
} from "./tokenService/tokenService";
import { TokenVerifier } from "./tokenService/tokenVerifier";

const tokenServiceDependencies: ITokenServiceDependencies = {
  publicKeyGetter: () => new PublicKeyGetter(),
  tokenVerifier: () => new TokenVerifier()
};

export interface IAsyncActiveSessionDependencies {
  env: NodeJS.ProcessEnv;
  logger: () => Logger<MessageName>;
  tokenServiceDependencies: ITokenServiceDependencies;
  tokenService: (
    tokenServiceDependencies: ITokenServiceDependencies,
  ) => ITokenService;
  sessionService: (tableName: string) => ISessionService;
}

export const dependencies: IAsyncActiveSessionDependencies = {
  env: process.env,
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  tokenServiceDependencies,
  tokenService: (tokenServiceDependencies: ITokenServiceDependencies) =>
    new TokenService(tokenServiceDependencies),
  sessionService: (tableName: string) => new SessionService(tableName),
};
