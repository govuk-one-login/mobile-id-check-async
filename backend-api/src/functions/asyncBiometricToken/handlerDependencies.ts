import { GetSecrets } from "../common/config/secrets";
import { getSecretsFromParameterStore } from "../adapters/getSecretsFromParameterStore";
import {
  getBiometricToken,
  GetBiometricToken,
} from "./getBiometricToken/getBiometricToken";
import { SessionRegistry } from "../common/session/SessionRegistry";
import { DynamoDbAdapter } from "../adapters/dynamoDbAdapter";
import { EventService } from "../services/events/eventService";
import { IEventService } from "../services/events/types";

export type IAsyncBiometricTokenDependencies = {
  env: NodeJS.ProcessEnv;
  getSecrets: GetSecrets;
  getBiometricToken: GetBiometricToken;
  getSessionRegistry: (tableName: string) => SessionRegistry;
  getEventService: (sqsQueue: string) => IEventService;
};

export const runtimeDependencies: IAsyncBiometricTokenDependencies = {
  env: process.env,
  getSecrets: getSecretsFromParameterStore,
  getBiometricToken,
  getSessionRegistry: (tableName: string) => new DynamoDbAdapter(tableName),
  getEventService: (sqsQueue: string) => new EventService(sqsQueue),
};
