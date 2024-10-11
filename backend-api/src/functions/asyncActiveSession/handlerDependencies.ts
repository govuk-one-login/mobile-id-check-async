import { Logger } from "../services/logging/logger";
import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { MessageName, registeredLogs } from "./registeredLogs";
import { ITokenService, TokenService } from "./tokenService/tokenService";
import { IDecryptJwe, JweDecryptor } from "./jwe/jweDecryptor";
import {
  ISessionService,
  SessionService,
} from "../services/session/sessionService";

export interface IAsyncActiveSessionDependencies {
  env: NodeJS.ProcessEnv;
  logger: () => Logger<MessageName>;
  jweDecryptor: (encryptionKeyId: string) => IDecryptJwe;
  tokenService: () => ITokenService;
  sessionService: (tableName: string) => ISessionService;
}

export const dependencies: IAsyncActiveSessionDependencies = {
  env: process.env,
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  jweDecryptor: (encryptionKeyId: string) => new JweDecryptor(encryptionKeyId),
  tokenService: () => new TokenService(),
  sessionService: (tableName: string) => new SessionService(tableName),
};
