import { Logger } from "../services/logging/logger";
import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { MessageName, registeredLogs } from "./registeredLogs";
import {
  ITokenService,
  ITokenServiceDependencies,
  TokenService,
} from "./tokenService/tokenService";
import { PublicKeyGetter } from "./tokenService/publicKeyGetter";

const tokenServiceDependencies: ITokenServiceDependencies = {
  publicKeyGetter: () => new PublicKeyGetter(),
};

export interface IAsyncActiveSessionDependencies {
  env: NodeJS.ProcessEnv;
  logger: () => Logger<MessageName>;
  tokenServiceDependencies: ITokenServiceDependencies;
  tokenService: (
    tokenServiceDependencies: ITokenServiceDependencies,
  ) => ITokenService;
}

export const dependencies: IAsyncActiveSessionDependencies = {
  env: process.env,
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  tokenServiceDependencies: tokenServiceDependencies,
  tokenService: (tokenServiceDependencies: ITokenServiceDependencies) =>
    new TokenService(tokenServiceDependencies),
};
