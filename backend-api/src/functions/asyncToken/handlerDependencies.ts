import {
  IGetRegisteredIssuerUsingClientSecrets,
  ClientRegistryService,
} from "../services/clientRegistryService/clientRegistryService";
import { EventService } from "../services/events/eventService";
import { IMintToken, TokenService } from "./tokenService/tokenService";
import {
  IRequestService,
  RequestService,
} from "./requestService/requestService";
import { IEventService } from "../services/events/types";

export interface IAsyncTokenRequestDependencies {
  env: NodeJS.ProcessEnv;
  eventService: (sqsQueue: string) => IEventService;
  clientRegistryService: (
    clientRegistryParameterName: string,
  ) => IGetRegisteredIssuerUsingClientSecrets;
  tokenService: (signingKey: string) => IMintToken;
  requestService: () => IRequestService;
}

export const dependencies: IAsyncTokenRequestDependencies = {
  env: process.env,
  eventService: (sqsQueue: string) => new EventService(sqsQueue),
  clientRegistryService: (clientRegistryParameterName: string) =>
    new ClientRegistryService(clientRegistryParameterName),
  tokenService: (signingKey: string) => new TokenService(signingKey),
  requestService: () => new RequestService(),
};
