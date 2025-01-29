import { GetSecrets } from "../common/config/secrets";
import { getSecretsFromParameterStore } from "../adapters/getSecretsFromParameterStore";
import {
  getBiometricToken,
  GetBiometricToken,
} from "./getBiometricToken/getBiometricToken";
import { SessionRegistry } from "../common/session/SessionRegistry";
import { DynamoDbAdapter } from "../adapters/dynamoDbAdapter";
import { EventService, IEventService } from "../services/events/eventService";

export type IAsyncBiometricTokenDependencies = {
  env: NodeJS.ProcessEnv;
  getSecrets: GetSecrets;
  getBiometricToken: GetBiometricToken;
  getSessionRegistry: (tableName: string) => SessionRegistry;
  eventService: (sqsQueue: string) => IEventService;
};

export const runtimeDependencies: IAsyncBiometricTokenDependencies = {
  env: process.env,
  getSecrets: getSecretsFromParameterStore,
  getBiometricToken,
  getSessionRegistry: (tableName: string) => new DynamoDbAdapter(tableName),
  eventService: (sqsQueue: string) => new EventService(sqsQueue),
};
