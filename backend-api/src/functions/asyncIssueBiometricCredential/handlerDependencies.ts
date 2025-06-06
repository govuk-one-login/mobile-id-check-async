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
import { SQSMessageBody } from "../adapters/aws/sqs/types";
import { IEventService } from "../services/events/types";
import { EventService } from "../services/events/eventService";
import { createKmsSignedJwt } from "../adapters/aws/kms/createKmsSignedJwt/createKmsSignedJwt";
import { CreateKmsSignedJwt } from "../adapters/aws/kms/createKmsSignedJwt/types";
import {
  getCredentialFromBiometricSession,
  IGetCredentialFromBiometricSession,
} from "@govuk-one-login/mobile-id-check-biometric-credential";

export type IssueBiometricCredentialDependencies = {
  env: NodeJS.ProcessEnv;
  getSessionRegistry: (tableName: string) => SessionRegistry;
  getSecrets: GetSecrets;
  getBiometricSession: GetBiometricSession;
  getEventService: (sqsQueue: string) => IEventService;
  sendMessageToSqs: (
    sqsArn: string,
    messageBody: SQSMessageBody,
  ) => Promise<Result<void, void>>;
  getCredentialFromBiometricSession: IGetCredentialFromBiometricSession;
  createKmsSignedJwt: CreateKmsSignedJwt;
};

export const runtimeDependencies: IssueBiometricCredentialDependencies = {
  env: process.env,
  getSessionRegistry: (tableName: string) => new DynamoDbAdapter(tableName),
  getSecrets: getSecretsFromParameterStore,
  getBiometricSession,
  getEventService: (sqsQueue: string) => new EventService(sqsQueue),
  sendMessageToSqs,
  getCredentialFromBiometricSession,
  createKmsSignedJwt,
};
