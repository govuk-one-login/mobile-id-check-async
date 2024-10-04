import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import {
  IGetPartialRegisteredClientByClientId,
  ClientRegistryService,
} from "../services/clientRegistryService/clientRegistryService";
import { IEventService, EventService } from "../services/events/eventService";
import { MessageName, registeredLogs } from "./registeredLogs";
import {
  IDecodeToken,
  IVerifyTokenSignature,
  TokenService,
} from "./tokenService/tokenService";
import { Logger } from "../services/logging/logger";
import {DynamoDbAdapter} from "../adapters/session/dynamoDbAdapter";
import {IDataStore} from "../adapters/session/datastore";

export interface IAsyncCredentialDependencies {
  logger: () => Logger<MessageName>;
  eventService: (sqsQueue: string) => IEventService;
  tokenService: () => IDecodeToken & IVerifyTokenSignature;
  clientRegistryService: (
    clientRegistryParameterName: string,
  ) => IGetPartialRegisteredClientByClientId;
  datastore: (tableName: string) => IDataStore;
  env: NodeJS.ProcessEnv;
}

export const dependencies: IAsyncCredentialDependencies = {
  env: process.env,
  eventService: (sqsQueue: string) => new EventService(sqsQueue),
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  clientRegistryService: (clientRegistryParameterName: string) =>
    new ClientRegistryService(clientRegistryParameterName),
  tokenService: () => new TokenService(),
  datastore: (tableName: string) =>
    new DynamoDbAdapter(tableName),
};
