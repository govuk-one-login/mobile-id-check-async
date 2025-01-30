import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import {
  IGetPartialRegisteredClientByClientId,
  ClientRegistryService,
} from "../services/clientRegistryService/clientRegistryService";
import { EventService } from "../services/events/eventService";
import { MessageName, registeredLogs } from "./registeredLogs";
import {
  IDecodeToken,
  IVerifyTokenSignature,
  TokenService,
} from "./tokenService/tokenService";
import { Logger } from "../services/logging/logger";
import {
  ISessionService,
  SessionService,
} from "../services/session/sessionService";
import { IEventService } from "../services/events/types";

export interface IAsyncCredentialDependencies {
  logger: () => Logger<MessageName>;
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
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  clientRegistryService: (clientRegistryParameterName: string) =>
    new ClientRegistryService(clientRegistryParameterName),
  tokenService: () => new TokenService(),
  sessionService: (tableName: string) => new SessionService(tableName),
};
