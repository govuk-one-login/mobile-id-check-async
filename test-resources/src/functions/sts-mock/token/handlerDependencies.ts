import { IKeyRetriever, KeyRetriever } from "./keyRetriever/keyRetriever.js";
import {
  ITokenEncrypter,
  TokenEncrypter,
} from "./tokenEncrypter/tokenEncrypter.js";
import { ITokenSigner, TokenSigner } from "./tokenSigner/tokenSigner.js";
import {
  IValidateServiceTokenRequest,
  validateServiceTokenRequest,
} from "./validateServiceTokenRequest/validateServiceTokenRequest.js";

export interface TokenDependencies {
  env: NodeJS.ProcessEnv;
  validateServiceTokenRequest: IValidateServiceTokenRequest;
  keyRetriever: () => IKeyRetriever;
  tokenSigner: () => ITokenSigner;
  tokenEncrypter: (jwksUri: string) => ITokenEncrypter;
}

export const dependencies: TokenDependencies = {
  env: process.env,
  validateServiceTokenRequest: validateServiceTokenRequest,
  keyRetriever: () => new KeyRetriever(),
  tokenSigner: () => new TokenSigner(),
  tokenEncrypter: (jwksUri: string) => new TokenEncrypter(jwksUri),
};
