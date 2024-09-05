import { Logger } from "../services/logging/logger";
import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { MessageName, registeredLogs } from "./registeredLogs";
import {
  IMakeProxyRequest,
  ProxyRequestService,
} from "./proxyRequestService/proxyRequestService";

export interface IMockAsyncTokenDependencies {
  env: NodeJS.ProcessEnv;
  logger: () => Logger<MessageName>;
  proxyRequestService: () => IMakeProxyRequest;
}

export const dependencies: IMockAsyncTokenDependencies = {
  env: process.env,
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  proxyRequestService: () => new ProxyRequestService(),
};
