import { Logger } from "../services/logging/logger";
import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { MessageName, registeredLogs } from "./registeredLogs";
import { ITokenService, TokenService } from "./tokenService/tokenService";
import { IDecryptJwe, JweDecryptor } from "./jwe/jweDecryptor";
import { KMSAdapter } from "../adapters/kmsAdapter";
import { GcmDecryptor, IDecryptSymmetric } from "./jwe/gcmDecryptor";
import { IDecryptAsymmetric, RsaDecryptor } from "./jwe/rsaDecryptor";

export interface IAsyncActiveSessionDependencies {
  env: NodeJS.ProcessEnv;
  logger: () => Logger<MessageName>;
  kmsAdapter: (keyId: string) => KMSAdapter;
  gcmDecryptor: () => GcmDecryptor;
  rsaDecryptor: (kmsAdapter: KMSAdapter) => IDecryptAsymmetric;
  jweDecryptor: (
    asymmetricDecryptor: IDecryptAsymmetric,
    symmetricDecryptor: IDecryptSymmetric,
  ) => IDecryptJwe;
  tokenService: (jweDecryptor: IDecryptJwe) => ITokenService;
}

export const dependencies: IAsyncActiveSessionDependencies = {
  env: process.env,
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  kmsAdapter: (keyId) => new KMSAdapter(keyId),
  gcmDecryptor: () => new GcmDecryptor(),
  rsaDecryptor: (kmsAdapter) => new RsaDecryptor(kmsAdapter),
  jweDecryptor: (asymmetricDecryptor, symmetricDecryptor) =>
    new JweDecryptor(asymmetricDecryptor, symmetricDecryptor),
  tokenService: (jweDecryptor) => new TokenService(jweDecryptor),
};
