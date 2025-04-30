import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { Logger } from "../services/logging/logger";
import { MessageName, registeredLogs } from "./registeredLogs";
import { CloudFormationCustomResourceEvent, Context } from "aws-lambda";
import { IJwksBuilder, JwksBuilder } from "./jwksBuilder/jwksBuilder";
import { IJwksUploader, JwksUploader } from "./jwksUploader/jwksUploader";
import {
  CustomResourceEventSender,
  ICustomResourceEventSender,
} from "./customResourceEventSender/customResourceEventSender";

export interface IJwksDependencies {
  env: NodeJS.ProcessEnv;
  logger: () => Logger<MessageName>;
  jwksBuilder: (keyIds: string[]) => IJwksBuilder;
  jwksUploader: () => IJwksUploader;
  customResourceResultSender: (
    event: CloudFormationCustomResourceEvent,
    context: Context,
  ) => ICustomResourceEventSender;
}

export const dependencies: IJwksDependencies = {
  env: process.env,
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  jwksBuilder: (keyIds: string[]) => new JwksBuilder(keyIds),
  jwksUploader: () => new JwksUploader(),
  customResourceResultSender: (
    event: CloudFormationCustomResourceEvent,
    context: Context,
  ) => new CustomResourceEventSender(event, context),
};
