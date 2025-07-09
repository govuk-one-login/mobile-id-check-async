import {
  ISessionService,
  SessionService,
} from "../services/session/sessionService";
import { TokenService } from "./TokenService/TokenService";
import { IDecryptJwe, JweDecrypter } from "./jwe/jweDecrypter";
import { ITokenService } from "./TokenService/types";
import { IEventService } from "../services/events/types";
import { EventService } from "../services/events/eventService";

export interface IAsyncActiveSessionDependencies {
  env: NodeJS.ProcessEnv;
  jweDecrypter: (encryptionKeyId: string) => IDecryptJwe;
  tokenService: () => ITokenService;
  sessionService: (tableName: string) => ISessionService;
  eventService: (sqsQueue: string) => IEventService;
}

export const dependencies: IAsyncActiveSessionDependencies = {
  env: process.env,
  jweDecrypter: (encryptionKeyId: string) => new JweDecrypter(encryptionKeyId),
  tokenService: () => new TokenService(),
  sessionService: (tableName: string) => new SessionService(tableName),
  eventService: (sqsQueue) => new EventService(sqsQueue),
};
