import { Logger } from "../services/logging/logger";
import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { MessageName, registeredLogs } from "./registeredLogs";

export interface IMockAsyncTokenDependencies {
  logger: () => Logger<MessageName>;
}

export const dependencies: IMockAsyncTokenDependencies = {
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
};
