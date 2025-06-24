import { Result } from "../../utils/result";
import { IGetKeys } from "../../common/jwks/JwksCache/types";

export type TokenServiceDependencies = {
  getKeys: IGetKeys;
};

export interface ITokenService {
  validateServiceToken: (
    token: string,
    audience: string,
    stsBaseUrl: string,
  ) => Promise<Result<string>>;
}

export type ExpectedClaims = {
  aud: string;
  iss: string;
  scope: "idCheck.activeSession.read";
};
