import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { IGetPartialRegisteredClientByClientId, ClientRegistryService } from "../services/clientRegistryService/clientRegistryService";
import { IEventService, EventService } from "../services/events/eventService";
import { MessageName, registeredLogs } from "./registeredLogs";
import { IGetActiveSession, ICreateSession, SessionService } from "./sessionService/sessionService";
import { IDecodeToken, IVerifyTokenSignature, TokenService } from "./tokenService/tokenService";
import { Logger } from "../services/logging/logger";

export interface Dependencies {
  logger: () => Logger<MessageName>;
  eventService: (sqsQueue: string) => IEventService;
  tokenService: () => IDecodeToken & IVerifyTokenSignature;
  clientRegistryService: (
    clientRegistryParameterName: string,
  ) => IGetPartialRegisteredClientByClientId;
  sessionService: (
    tableName: string,
    indexName: string,
  ) => IGetActiveSession & ICreateSession;
  env: NodeJS.ProcessEnv;
}

export const dependencies: Dependencies = {
  env: process.env,
  eventService: (sqsQueue: string) => new EventService(sqsQueue),
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  clientRegistryService: (clientRegistryParameterName: string) =>
    new ClientRegistryService(clientRegistryParameterName),
  tokenService: () => new TokenService(),
  sessionService: (tableName: string, indexName: string) =>
    new SessionService(tableName, indexName),
};