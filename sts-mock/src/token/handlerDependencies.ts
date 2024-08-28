import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { MessageName, registeredLogs } from "./registeredLogs";
import { Logger } from "../../../backend-api/src/functions/services/logging/logger";

export interface Dependencies {
  logger: () => Logger<MessageName>;
  env: NodeJS.ProcessEnv;
}

export const dependencies: Dependencies = {
  env: process.env,
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
};
