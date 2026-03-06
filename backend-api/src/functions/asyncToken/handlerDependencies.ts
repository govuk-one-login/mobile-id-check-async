import {
  IGetRegisteredIssuerUsingClientSecrets,
  ClientRegistryService,
} from "../services/clientRegistryService/clientRegistryService";
import { IMintToken, TokenService } from "./tokenService/tokenService";
import {
  IRequestService,
  RequestService,
} from "./requestService/requestService";
import { ISendMessageToSqs } from "../adapters/aws/sqs/types";
import { sendMessageToSqs } from "../adapters/aws/sqs/sendMessageToSqs";

export interface IAsyncTokenRequestDependencies {
  env: NodeJS.ProcessEnv;
  clientRegistryService: (
    clientRegistryParameterName: string,
  ) => IGetRegisteredIssuerUsingClientSecrets;
  tokenService: (signingKey: string) => IMintToken;
  requestService: () => IRequestService;
  sendMessageToSqs: ISendMessageToSqs;
}

export const dependencies: IAsyncTokenRequestDependencies = {
  env: process.env,
  clientRegistryService: (clientRegistryParameterName: string) =>
    new ClientRegistryService(clientRegistryParameterName),
  tokenService: (signingKey: string) => new TokenService(signingKey),
  requestService: () => new RequestService(),
  sendMessageToSqs: sendMessageToSqs,
};
