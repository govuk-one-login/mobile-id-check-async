import {
  ISessionService,
  SessionService,
} from "../services/session/sessionService";
import { TokenService } from "./TokenService/TokenService";
import { IDecryptJwe, JweDecrypter } from "./jwe/jweDecrypter";
import { ITokenService } from "./TokenService/types";
import { ISendMessageToSqs } from "../adapters/aws/sqs/types";
import { sendMessageToSqs } from "../adapters/aws/sqs/sendMessageToSqs";

export interface IAsyncActiveSessionDependencies {
  env: NodeJS.ProcessEnv;
  jweDecrypter: (encryptionKeyId: string) => IDecryptJwe;
  tokenService: () => ITokenService;
  sessionService: (tableName: string) => ISessionService;
  sendMessageToSqs: ISendMessageToSqs;
}

export const dependencies: IAsyncActiveSessionDependencies = {
  env: process.env,
  jweDecrypter: (encryptionKeyId: string) => new JweDecrypter(encryptionKeyId),
  tokenService: () => new TokenService(),
  sessionService: (tableName: string) => new SessionService(tableName),
  sendMessageToSqs,
};
