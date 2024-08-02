import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { Logger } from "../services/logging/logger";
import {
  IGetRegisteredIssuerUsingClientSecrets,
  ClientRegistryService,
} from "../services/clientRegistryService/clientRegistryService";
import { EventService, IEventService } from "../services/events/eventService";
import { MessageName, registeredLogs } from "./registeredLogs";
import {
  IProcessRequest,
  RequestService,
} from "./requestService/requestService";
import { IMintToken, TokenService } from "./tokenService/tokenService";

export interface IAsyncTokenRequestDependencies {
  env: NodeJS.ProcessEnv;
  eventService: (sqsQueue: string) => IEventService;
  logger: () => Logger<MessageName>;
  requestService: () => IProcessRequest;
  clientRegistryService: (
    clientRegistryParameterName: string,
  ) => IGetRegisteredIssuerUsingClientSecrets;
  tokenService: (signingKey: string) => IMintToken;
}

export const dependencies: IAsyncTokenRequestDependencies = {
  env: process.env,
  eventService: (sqsQueue: string) => new EventService(sqsQueue),
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  requestService: () => new RequestService(),
  clientRegistryService: (clientRegistryParameterName: string) =>
    new ClientRegistryService(clientRegistryParameterName),
  tokenService: (signingKey: string) => new TokenService(signingKey),
};
