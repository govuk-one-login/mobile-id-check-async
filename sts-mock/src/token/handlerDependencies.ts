import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { MessageName, registeredLogs } from "./registeredLogs";
import { Logger } from "../services/logging/logger";
import {
  IValidateServiceTokenRequest,
  validateServiceTokenRequest,
} from "./validateServiceTokenRequest/validateServiceTokenRequest";
import { ITokenSigner, TokenSigner } from "./tokenSigner/tokenSigner";
import { IKeyRetriever, KeyRetriever } from "./keyRetriever/keyRetriever";

export interface ITokenDependencies {
  env: NodeJS.ProcessEnv;
  logger: () => Logger<MessageName>;
  validateServiceTokenRequest: IValidateServiceTokenRequest;
  keyRetriever: () => IKeyRetriever;
  tokenSigner: () => ITokenSigner;
}

export const dependencies: ITokenDependencies = {
  env: process.env,
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  validateServiceTokenRequest: validateServiceTokenRequest,
  keyRetriever: () => new KeyRetriever(),
  tokenSigner: () => new TokenSigner(),
};
