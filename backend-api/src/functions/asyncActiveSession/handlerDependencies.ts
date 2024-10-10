import { Logger } from "../services/logging/logger";
import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { MessageName, registeredLogs } from "./registeredLogs";
import { ITokenService, TokenService } from "./tokenService/tokenService";
import { IDecryptJwe, JweDecryptor } from "./jwe/jweDecryptor";

export interface IAsyncActiveSessionDependencies {
  env: NodeJS.ProcessEnv;
  logger: () => Logger<MessageName>;
  jweDecryptor: (encryptionKeyId: string) => IDecryptJwe;
  tokenService: () => ITokenService;
}

export const dependencies: IAsyncActiveSessionDependencies = {
  env: process.env,
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  jweDecryptor: (encryptionKeyId: string) => new JweDecryptor(encryptionKeyId),
  tokenService: () => new TokenService(),
};
