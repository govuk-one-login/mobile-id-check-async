import { IKeyRetriever, KeyRetriever } from "./keyRetriever/keyRetriever";
import {
  ITokenEncrypter,
  TokenEncrypter,
} from "./tokenEncrypter/tokenEncrypter";
import { ITokenSigner, TokenSigner } from "./tokenSigner/tokenSigner";
import {
  IValidateServiceTokenRequest,
  validateServiceTokenRequest,
} from "./validateServiceTokenRequest/validateServiceTokenRequest";

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
