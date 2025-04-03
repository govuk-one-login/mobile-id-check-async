import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { MessageName, registeredLogs } from "./registeredLogs";
import { Logger } from "../../services/logging-OLD/logger";
import {
  IValidateServiceTokenRequest,
  validateServiceTokenRequest,
} from "./validateServiceTokenRequest/validateServiceTokenRequest";
import { ITokenSigner, TokenSigner } from "./tokenSigner/tokenSigner";
import { IKeyRetriever, KeyRetriever } from "./keyRetriever/keyRetriever";
import {
  ITokenEncrypter,
  TokenEncrypter,
} from "./tokenEncrypter/tokenEncrypter";

export interface TokenDependencies {
  env: NodeJS.ProcessEnv;
  logger: () => Logger<MessageName>;
  validateServiceTokenRequest: IValidateServiceTokenRequest;
  keyRetriever: () => IKeyRetriever;
  tokenSigner: () => ITokenSigner;
  tokenEncrypter: (jwksUri: string) => ITokenEncrypter;
}

export const dependencies: TokenDependencies = {
  env: process.env,
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  validateServiceTokenRequest: validateServiceTokenRequest,
  keyRetriever: () => new KeyRetriever(),
  tokenSigner: () => new TokenSigner(),
  tokenEncrypter: (jwksUri: string) => new TokenEncrypter(jwksUri),
};
