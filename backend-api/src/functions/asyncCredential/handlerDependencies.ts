import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import {
  IGetPartialRegisteredClientByClientId,
  ClientRegistryService,
} from "../services/clientRegistryService/clientRegistryService";
import { IEventService, EventService } from "../services/events/eventService";
import { MessageName, registeredLogs } from "./registeredLogs";
import { DynamoDbSessionRepository } from "../repositories/session/dynamoDbSessionRepository";
import { ISessionRepository } from "../repositories/session/sessionRepository";
import {
  IDecodeToken,
  IVerifyTokenSignature,
  TokenService,
} from "./tokenService/tokenService";
import { Logger } from "../services/logging/logger";

export interface IAsyncCredentialDependencies {
  logger: () => Logger<MessageName>;
  eventService: (sqsQueue: string) => IEventService;
  tokenService: () => IDecodeToken & IVerifyTokenSignature;
  clientRegistryService: (
    clientRegistryParameterName: string,
  ) => IGetPartialRegisteredClientByClientId;
  dynamoDbSessionRepository: (tableName: string) => ISessionRepository;
  env: NodeJS.ProcessEnv;
}

export const dependencies: IAsyncCredentialDependencies = {
  env: process.env,
  eventService: (sqsQueue: string) => new EventService(sqsQueue),
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  clientRegistryService: (clientRegistryParameterName: string) =>
    new ClientRegistryService(clientRegistryParameterName),
  tokenService: () => new TokenService(),
  dynamoDbSessionRepository: (tableName: string) =>
    new DynamoDbSessionRepository(tableName),
};
