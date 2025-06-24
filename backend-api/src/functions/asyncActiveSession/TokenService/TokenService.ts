import { Result, successResult } from "../../utils/result";
import {
  ExpectedClaims,
  ITokenService,
  TokenServiceDependencies,
} from "./types";
import { InMemoryJwksCache } from "../../common/jwks/JwksCache/JwksCache";
import { validateServiceTokenPayload } from "./validateServiceTokenPayload";
import { validateServiceTokenHeader } from "./validateServiceTokenHeader";
import { verifyServiceTokenSignature } from "./verifyServiceTokenSignature";

const tokenServiceDependencies: TokenServiceDependencies = {
  getKeys: (jwksUri: string, keyId?: string) =>
    InMemoryJwksCache.getSingletonInstance().getJwks(jwksUri, keyId),
};

export class TokenService implements ITokenService {
  private readonly dependencies: TokenServiceDependencies;

  constructor(dependencies = tokenServiceDependencies) {
    this.dependencies = dependencies;
  }

  async validateServiceToken(
    token: string,
    audience: string,
    stsBaseUrl: string,
  ): Promise<Result<string>> {
    const validateServiceTokenHeaderResult = validateServiceTokenHeader(token);
    if (validateServiceTokenHeaderResult.isError) {
      return validateServiceTokenHeaderResult;
    }
    const { kid } = validateServiceTokenHeaderResult.value;

    const expectedClaims: ExpectedClaims = {
      aud: audience,
      iss: stsBaseUrl,
      scope: "idCheck.activeSession.read",
    };
    const validateServiceTokenPayloadResult = validateServiceTokenPayload(
      token,
      expectedClaims,
    );
    if (validateServiceTokenPayloadResult.isError) {
      return validateServiceTokenPayloadResult;
    }
    const sub = validateServiceTokenPayloadResult.value;

    const verifyResult = await verifyServiceTokenSignature(
      {
        token,
        kid,
        stsBaseUrl,
      },
      this.dependencies,
    );
    if (verifyResult.isError) {
      return verifyResult;
    }

    return successResult(sub);
  }
}
