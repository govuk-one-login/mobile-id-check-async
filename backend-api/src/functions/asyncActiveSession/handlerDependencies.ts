import {
  ISessionService,
  SessionService,
} from "../services/session/sessionService";
import { ITokenService, TokenService } from "./tokenService/tokenService";
import { IDecryptJwe, JweDecrypter } from "./jwe/jweDecrypter";

export interface IAsyncActiveSessionDependencies {
  env: NodeJS.ProcessEnv;
  jweDecrypter: (encryptionKeyId: string) => IDecryptJwe;
  tokenService: () => ITokenService;
  sessionService: (tableName: string) => ISessionService;
}

export const dependencies: IAsyncActiveSessionDependencies = {
  env: process.env,
  jweDecrypter: (encryptionKeyId: string) => new JweDecrypter(encryptionKeyId),
  tokenService: () => new TokenService(),
  sessionService: (tableName: string) => new SessionService(tableName),
};
