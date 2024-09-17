import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { MessageName, registeredLogs } from "./registeredLogs";
import { Logger } from "../services/logging/logger";
import {IValidateServiceTokenRequestBody, validateServiceTokenRequestBody} from "./validateServiceTokenRequestBody";
import {ServiceTokenGenerator} from "./serviceTokenGenerator/serviceTokenGenerator";

export interface Dependencies {
  env: NodeJS.ProcessEnv;
  logger: () => Logger<MessageName>;
  validateServiceTokenRequestBody: IValidateServiceTokenRequestBody;
  serviceTokenGenerator: (signingKeyId: string, encryptionKeyId: string) => ServiceTokenGenerator;
}

export const dependencies: Dependencies = {
  env: process.env,
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  validateServiceTokenRequestBody,
  serviceTokenGenerator: (signingKeyId: string, encryptionKeyId: string) => new ServiceTokenGenerator(signingKeyId, encryptionKeyId);
};
