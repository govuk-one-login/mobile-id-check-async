import { Logger } from "../services/logging/logger";
import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { MessageName, registeredLogs } from "./registeredLogs";
import {
  IMakeProxyRequest,
  ProxyRequestService,
} from "./proxyRequestService/proxyRequestService";

export interface IMockProxyDependencies {
  env: NodeJS.ProcessEnv;
  logger: () => Logger<MessageName>;
  proxyRequestService: () => IMakeProxyRequest;
}

export const dependencies: IMockProxyDependencies = {
  env: process.env,
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  proxyRequestService: () => new ProxyRequestService(),
};
