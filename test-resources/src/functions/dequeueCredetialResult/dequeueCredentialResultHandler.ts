import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { Context, SQSEvent } from "aws-lambda";
import { Logger } from "../services/logging/logger";
import { MessageName, registeredLogs } from "./registeredLogs";

export const lambdaHandlerConstructor = async (
  dependencies: IDequeueCredentialResultDependencies,
  _event: SQSEvent,
  context: Context,
): Promise<void> => {
  const logger = dependencies.logger();
  logger.addContext(context);
  logger.log("STARTED");

  logger.log("COMPLETED");
};

export interface IDequeueCredentialResultDependencies {
  env: NodeJS.ProcessEnv;
  logger: () => Logger<MessageName>;
}

const dependencies: IDequeueCredentialResultDependencies = {
  env: process.env,
  logger: () =>
    new Logger<MessageName>(
      new PowertoolsLogger({ serviceName: "Dequeue Function" }),
      registeredLogs,
    ),
};

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
