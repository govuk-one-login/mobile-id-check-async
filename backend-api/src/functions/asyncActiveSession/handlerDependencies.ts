import { Logger } from "../services/logging/logger";
import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { MessageName, registeredLogs } from "./registeredLogs";
import { ITokenService, TokenService } from "./tokenService/tokenService";
import { IKmsAdapter, KMSAdapter } from "../adapters/kmsAdapter";

export interface IAsyncActiveSessionDependencies {
  env: NodeJS.ProcessEnv;
  logger: () => Logger<MessageName>;
  kmsAdapter: (encryptionKeyArn: string) => IKmsAdapter;
  tokenService: (kmsAdapter: IKmsAdapter) => ITokenService;
}

export const dependencies: IAsyncActiveSessionDependencies = {
  env: process.env,
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  kmsAdapter: (encryptionKeyArn: string) => new KMSAdapter(encryptionKeyArn),
  tokenService: (kmsAdapter: IKmsAdapter) => new TokenService(kmsAdapter),
};
