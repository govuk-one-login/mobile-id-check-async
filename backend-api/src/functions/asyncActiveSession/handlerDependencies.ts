import { Logger } from "../services/logging/logger";
import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { MessageName, registeredLogs } from "./registeredLogs";
import {
  ISessionService,
  SessionService,
} from "../services/session/sessionService";
import { PublicKeyGetter } from "./tokenService/publicKeyGetter";
import {
  ITokenService,
  ITokenServiceDependencies,
  TokenService,
} from "./tokenService/tokenService";
import { IDecryptJwe, JweDecryptor } from "./jwe/jweDecryptor";

const tokenServiceDependencies: ITokenServiceDependencies = {
  publicKeyGetter: () => new PublicKeyGetter(),
};

export interface IAsyncActiveSessionDependencies {
  env: NodeJS.ProcessEnv;
  logger: () => Logger<MessageName>;
  jweDecryptor: (encryptionKeyId: string) => IDecryptJwe;
  tokenServiceDependencies: ITokenServiceDependencies;
  tokenService: (
    tokenServiceDependencies: ITokenServiceDependencies,
  ) => ITokenService;
  sessionService: (tableName: string) => ISessionService;
}

export const dependencies: IAsyncActiveSessionDependencies = {
  env: process.env,
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  jweDecryptor: (encryptionKeyId: string) => new JweDecryptor(encryptionKeyId),
  tokenServiceDependencies,
  tokenService: (tokenServiceDependencies: ITokenServiceDependencies) =>
    new TokenService(tokenServiceDependencies),
  sessionService: (tableName: string) => new SessionService(tableName),
};
