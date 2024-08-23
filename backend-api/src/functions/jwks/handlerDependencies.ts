import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { Logger } from "../services/logging/logger";
import { MessageName, registeredLogs } from "./registeredLogs";
import {CloudFormationCustomResourceEvent, Context} from "aws-lambda";
import {IJwksBuilder, JwksBuilder} from "./jwksBuilder/jwksBuilder";
import {IJwksUploader, JwksUploader} from "./jwksUploader/jwksUploader";
import {
  CustomResourceResultSender,
  ICustomResourceResultSender
} from "./customResourceResultSender/customResourceResultSender";

export interface IJwksDependencies {
  env: NodeJS.ProcessEnv;
  logger: () => Logger<MessageName>;
  jwksBuilder: () => IJwksBuilder;
  jwksUploader: (bucket: string) => IJwksUploader;
  customResourceResultSender: (
      event: CloudFormationCustomResourceEvent,
      context: Context,
  ) => ICustomResourceResultSender;
}

export const dependencies: IJwksDependencies = {
  env: process.env,
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  jwksBuilder: () => new JwksBuilder(),
  jwksUploader: (bucket: string) => new JwksUploader(bucket),
  customResourceResultSender: (
      event: CloudFormationCustomResourceEvent,
      context: Context,
  ) => new CustomResourceResultSender(event, context),
};
