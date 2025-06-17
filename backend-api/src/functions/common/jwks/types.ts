import { ISendHttpRequest } from "../../adapters/http/sendHttpRequest";
import { Result } from "../../utils/result";

export type IGetJwksFromJwksUri = (
  jwksUri: string,
  sendRequest?: ISendHttpRequest,
) => Promise<Result<GetJwksFromJwksUriResponse, GetKeysError>>;

export type GetJwksFromJwksUriResponse = GetKeysResponse & {
  cacheDurationMillis: number;
};

export type GetKeysResponse = {
  keys: object[];
};

export type GetKeysError = { reason: GetJwksErrorReason };

export enum GetJwksErrorReason {
  ERROR_INVOKING_JWKS_ENDPOINT = "Error invoking JWKS endpoint",
  JWKS_ENDPOINT_RETURNED_MALFORMED_RESPONSE = "JWKS endpoint returned malformed response",
}

export interface JwksCache {
  getJwks: IGetKeys;
}

type IGetKeys = (
  jwksUri: string,
  keyId?: string,
) => Promise<Result<GetKeysResponse, GetKeysError>>;
