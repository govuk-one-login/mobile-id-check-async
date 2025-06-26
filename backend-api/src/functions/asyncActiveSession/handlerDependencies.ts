import {
  ISessionService,
  SessionService,
} from "../services/session/sessionService";
import { TokenService } from "./TokenService/TokenService";
import { IDecryptJwe, JweDecrypter } from "./jwe/jweDecrypter";
import { ITokenService } from "./TokenService/types";

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
