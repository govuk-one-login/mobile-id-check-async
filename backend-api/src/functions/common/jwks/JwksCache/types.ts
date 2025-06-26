import { ISendHttpRequest } from "../../../adapters/http/sendHttpRequest";
import { Result } from "../../../utils/result";

export type IGetJwksFromJwksUri = (
  jwksUri: string,
  dependencies: JwksCacheDependencies,
) => Promise<Result<GetJwksFromJwksUriResponse, void>>;

export type GetJwksFromJwksUriResponse = GetKeysResponse & {
  cacheDurationMillis: number;
};

export type GetKeysResponse = {
  keys: object[];
};

export interface JwksCache {
  getJwks: IGetKeys;
}

export interface JwksCacheDependencies {
  sendRequest: ISendHttpRequest;
}

export type IGetKeys = (
  jwksUri: string,
  keyId?: string,
) => Promise<Result<GetKeysResponse, void>>;
