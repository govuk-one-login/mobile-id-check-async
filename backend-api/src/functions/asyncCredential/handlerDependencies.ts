import {
  ClientRegistryService,
  IGetPartialRegisteredClientByClientId,
} from "../services/clientRegistryService/clientRegistryService";
import { EventService } from "../services/events/eventService";
import {
  IDecodeToken,
  IVerifyTokenSignature,
  TokenService,
} from "./tokenService/tokenService";
import {
  ISessionService,
  SessionService,
} from "../services/session/sessionService";
import { IEventService } from "../services/events/types";

export interface IAsyncCredentialDependencies {
  eventService: (sqsQueue: string) => IEventService;
  tokenService: () => IDecodeToken & IVerifyTokenSignature;
  clientRegistryService: (
    clientRegistryParameterName: string,
  ) => IGetPartialRegisteredClientByClientId;
  sessionService: (tableName: string) => ISessionService;
  env: NodeJS.ProcessEnv;
}

export const dependencies: IAsyncCredentialDependencies = {
  env: process.env,
  eventService: (sqsQueue: string) => new EventService(sqsQueue),
  clientRegistryService: (clientRegistryParameterName: string) =>
    new ClientRegistryService(clientRegistryParameterName),
  tokenService: () => new TokenService(),
  sessionService: (tableName: string) => new SessionService(tableName),
};
