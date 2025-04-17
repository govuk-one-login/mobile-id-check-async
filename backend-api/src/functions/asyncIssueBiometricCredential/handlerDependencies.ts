import { DynamoDbAdapter } from "../adapters/aws/dynamo/dynamoDbAdapter";
import { SessionRegistry } from "../common/session/SessionRegistry/SessionRegistry";
import { GetSecrets } from "../common/config/secrets";
import { getSecretsFromParameterStore } from "../adapters/aws/parameterStore/getSecretsFromParameterStore";

import {
  GetBiometricSession,
  getBiometricSession,
} from "./getBiometricSession/getBiometricSession";
import { Result } from "../utils/result";
import { sendMessageToSqs } from "../adapters/aws/sqs/sendMessageToSqs";
import { OutboundQueueErrorMessage } from "../adapters/aws/sqs/types";

import { IEventService } from "../services/events/types";
import { EventService } from "../services/events/eventService";

export type IssueBiometricCredentialDependencies = {
  env: NodeJS.ProcessEnv;
  getSessionRegistry: (tableName: string) => SessionRegistry;
  getSecrets: GetSecrets;
  getBiometricSession: GetBiometricSession;
  getEventService: (sqsQueue: string) => IEventService;
  sendMessageToSqs: (
    sqsArn: string,
    messageBody: OutboundQueueErrorMessage,
  ) => Promise<Result<void, void>>;
};

export const runtimeDependencies: IssueBiometricCredentialDependencies = {
  env: process.env,
  getSessionRegistry: (tableName: string) => new DynamoDbAdapter(tableName),
  getSecrets: getSecretsFromParameterStore,
  getBiometricSession,
  getEventService: (sqsQueue: string) => new EventService(sqsQueue),
  sendMessageToSqs,
};
