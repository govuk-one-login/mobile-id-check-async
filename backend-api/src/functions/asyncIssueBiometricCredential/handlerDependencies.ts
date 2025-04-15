import { GetSecrets } from "../common/config/secrets";
import { getSecretsFromParameterStore } from "../adapters/aws/parameterStore/getSecretsFromParameterStore";
import {
  GetBiometricSession,
  getBiometricSession,
} from "./getBiometricSession/getBiometricSession";
import { Result } from "../utils/result";
import { sendMessageToSqs } from "../adapters/aws/sqs/sendMessageToSqs";
import { IssueBiometricCredentialMessage } from "../adapters/aws/sqs/types";
import { SessionRegistry } from "../common/session/SessionRegistry/SessionRegistry";
import { DynamoDbAdapter } from "../adapters/aws/dynamo/dynamoDbAdapter";
import { IEventService } from "../services/events/types";
import { EventService } from "../services/events/eventService";

export type IssueBiometricCredentialDependencies = {
  env: NodeJS.ProcessEnv;
  getSecrets: GetSecrets;
  getBiometricSession: GetBiometricSession;

  getEventService: (sqsQueue: string) => IEventService;
  getSessionRegistry: (tableName: string) => SessionRegistry;
  sendMessageToSqs: (
    sqsArn: string,
    messageBody: IssueBiometricCredentialMessage,
  ) => Promise<Result<void, void>>;
};

export const runtimeDependencies: IssueBiometricCredentialDependencies = {
  env: process.env,
  getSecrets: getSecretsFromParameterStore,
  getBiometricSession,
  getEventService: (sqsQueue: string) => new EventService(sqsQueue),

  getSessionRegistry: (tableName: string) => new DynamoDbAdapter(tableName),
  sendMessageToSqs,
};
