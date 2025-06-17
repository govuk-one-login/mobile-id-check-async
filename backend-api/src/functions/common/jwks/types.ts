import { ISendHttpRequest } from "../../adapters/http/sendHttpRequest";
import { Result } from "../../utils/result";

export type IGetJwksFromJwksUri = (
  jwksUri: string,
  sendRequest?: ISendHttpRequest,
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

type IGetKeys = (
  jwksUri: string,
  keyId?: string,
) => Promise<Result<GetKeysResponse, void>>;
