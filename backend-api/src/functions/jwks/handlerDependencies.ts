import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { Logger } from "../services/logging/logger";
import { MessageName, registeredLogs } from "./registeredLogs";
import {CloudFormationCustomResourceEvent, Context} from "aws-lambda";

export interface IJwksDependencies {
  env: NodeJS.ProcessEnv;
  logger: () => Logger<MessageName>;
  jwksService: () => IJwksService;
  sendCustomResourceResult: (
      event: CloudFormationCustomResourceEvent,
      context: Context,
  ) => SendCustomResourceResult;
}

export const dependencies: IJwksDependencies = {
  env: process.env,
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  jwksService: () => new JwksService(),
  sendCustomResourceResult: (
      event: CloudFormationCustomResourceEvent,
      context: Context,
  ) => sendCustomResourceResult(event, context),
};
