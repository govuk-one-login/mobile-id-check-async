import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { MessageName, registeredLogs } from "./registeredLogs";
import { Logger } from "../services/logging/logger";
import {
  IValidateServiceTokenRequestBody,
  validateServiceTokenRequest,
} from "./validateServiceTokenRequest";
import { ServiceTokenGenerator } from "./serviceTokenGenerator/serviceTokenGenerator";

export interface Dependencies {
  env: NodeJS.ProcessEnv;
  logger: () => Logger<MessageName>;
  validateServiceTokenRequestBody: IValidateServiceTokenRequestBody;
  serviceTokenGenerator: (
    stsMockBaseUrl: string,
    keyStorageBucket: string,
    subjectId: string,
    scope: string,
    tokenTimeToLive: number,
  ) => ServiceTokenGenerator;
}

export const dependencies: Dependencies = {
  env: process.env,
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  validateServiceTokenRequestBody: validateServiceTokenRequest,
  serviceTokenGenerator: (
    stsMockBaseUrl: string,
    keyStorageBucket: string,
    subjectId: string,
    scope: string,
    tokenTimeToLive: number,
  ) =>
    new ServiceTokenGenerator(
      stsMockBaseUrl,
      keyStorageBucket,
      subjectId,
      scope,
      tokenTimeToLive,
    ),
};
