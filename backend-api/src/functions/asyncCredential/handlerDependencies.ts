import {
  ClientRegistryService,
  IGetPartialRegisteredClientByClientId,
} from "../services/clientRegistryService/clientRegistryService";
import {
  IDecodeToken,
  IVerifyTokenSignature,
  TokenService,
} from "./tokenService/tokenService";
import {
  ISessionService,
  SessionService,
} from "../services/session/sessionService";
import { ISendMessageToSqs } from "../adapters/aws/sqs/types";
import { sendMessageToSqs } from "../adapters/aws/sqs/sendMessageToSqs";

export interface IAsyncCredentialDependencies {
  tokenService: () => IDecodeToken & IVerifyTokenSignature;
  clientRegistryService: (
    clientRegistryParameterName: string,
  ) => IGetPartialRegisteredClientByClientId;
  sessionService: (tableName: string) => ISessionService;
  env: NodeJS.ProcessEnv;
  sendMessageToSqs: ISendMessageToSqs;
}

export const dependencies: IAsyncCredentialDependencies = {
  env: process.env,
  clientRegistryService: (clientRegistryParameterName: string) =>
    new ClientRegistryService(clientRegistryParameterName),
  tokenService: () => new TokenService(),
  sessionService: (tableName: string) => new SessionService(tableName),
  sendMessageToSqs,
};
