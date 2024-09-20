import { Logger } from "../services/logging/logger";
import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { MessageName, registeredLogs } from "./registeredLogs";

export interface IAsyncActiveSessionDependencies {
  env: NodeJS.ProcessEnv;
  logger: () => Logger<MessageName>;
  tokenService: () => //TODO: add interface
}

export const dependencies: IAsyncActiveSessionDependencies = {
  env: process.env,
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  tokenService: () => new TokenService()
};
