import { Result } from "../../utils/result";
import { IGetKeys } from "../../common/jwks/types";

export type VerifyToken = (
  token: string,
  kid: string,
  stsBaseUrl: string,
  dependencies?: VerifyTokenDependencies,
) => Promise<Result<void>>;

export type VerifyTokenDependencies = {
  getKeys: IGetKeys;
};

export interface ITokenService {
  validateServiceToken: (
    token: string,
    audience: string,
    stsBaseUrl: string,
  ) => Promise<Result<string>>;
}
