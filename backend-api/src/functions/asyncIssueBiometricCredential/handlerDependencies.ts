import { DynamoDbAdapter } from "../adapters/aws/dynamo/dynamoDbAdapter";
import { SessionRegistry } from "../common/session/SessionRegistry/SessionRegistry";
import { GetSecrets } from "../common/config/secrets";
import { getSecretsFromParameterStore } from "../adapters/aws/parameterStore/getSecretsFromParameterStore";
import { IEventService } from "../services/events/types";
import { EventService } from "../services/events/eventService";
import {
  IGetCredentialFromBiometricSession,
  mockGetCredentialFromBiometricSession,
} from "./mockGetCredentialFromBiometricSession/mockGetCredentialFromBiometricSession";

export type IssueBiometricCredentialDependencies = {
  env: NodeJS.ProcessEnv;
  getSessionRegistry: (tableName: string) => SessionRegistry;
  getSecrets: GetSecrets;
  getEventService: (sqsQueue: string) => IEventService;
  getCredentialFromBiometricSession: IGetCredentialFromBiometricSession;
};

export const runtimeDependencies: IssueBiometricCredentialDependencies = {
  env: process.env,
  getSessionRegistry: (tableName: string) => new DynamoDbAdapter(tableName),
  getSecrets: getSecretsFromParameterStore,
  getEventService: (sqsQueue: string) => new EventService(sqsQueue),
  getCredentialFromBiometricSession: mockGetCredentialFromBiometricSession,
};
