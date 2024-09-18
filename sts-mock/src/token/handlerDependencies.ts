import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { MessageName, registeredLogs } from "./registeredLogs";
import { Logger } from "../services/logging/logger";
import {
  IValidateServiceTokenRequest,
  validateServiceTokenRequest,
} from "./validateServiceTokenRequest";
import {
  IServiceTokenGenerator,
  ServiceTokenGenerator,
} from "./serviceTokenGenerator/serviceTokenGenerator";

export interface ITokenDependencies {
  env: NodeJS.ProcessEnv;
  logger: () => Logger<MessageName>;
  validateServiceTokenRequestBody: IValidateServiceTokenRequest;
  serviceTokenGenerator: (
    stsMockBaseUrl: string,
    keyStorageBucketName: string,
    privateKeyFileName: string,
    serviceTokenTimeToLive: number,
    subjectId: string,
    scope: string,
  ) => IServiceTokenGenerator;
}

export const dependencies: ITokenDependencies = {
  env: process.env,
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  validateServiceTokenRequestBody: validateServiceTokenRequest,
  serviceTokenGenerator: (
    stsMockBaseUrl: string,
    keyStorageBucketName: string,
    privateKeyFileName: string,
    serviceTokenTimeToLive: number,
    subjectId: string,
    scope: string,
  ) =>
    new ServiceTokenGenerator(
      stsMockBaseUrl,
      keyStorageBucketName,
      privateKeyFileName,
      serviceTokenTimeToLive,
      subjectId,
      scope,
    ),
};
