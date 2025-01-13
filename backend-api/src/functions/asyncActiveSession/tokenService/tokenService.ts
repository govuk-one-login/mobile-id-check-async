import {
  ErrorCategory,
  errorResult,
  Result,
  successResult,
} from "../../utils/result";
import { decodeJwt, decodeProtectedHeader } from "jose";
import { ITokenVerifier, TokenVerifier } from "./tokenVerifier";

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

export type TokenServicesDependencies = {
  tokenVerifier: ITokenVerifier;
};

const tokenServiceDependencies: TokenServicesDependencies = {
  tokenVerifier: new TokenVerifier(),
};

export class TokenService implements ITokenService {
  private readonly tokenVerifier: ITokenVerifier;

  constructor(dependencies = tokenServiceDependencies) {
    this.tokenVerifier = dependencies.tokenVerifier;
  }

  async validateServiceToken(
    token: string,
    audience: string,
    stsBaseUrl: string,
  ): Promise<Result<string>> {
    const validateServiceTokenHeaderResult =
      this.validateServiceTokenHeader(token);
    if (validateServiceTokenHeaderResult.isError) {
      return validateServiceTokenHeaderResult;
    }
    const { kid } = validateServiceTokenHeaderResult.value;

    const expectedClaims: ExpectedClaims = {
      aud: audience,
      iss: stsBaseUrl,
      scope: "idCheck.activeSession.read",
    };
    const validateServiceTokenPayloadResult = this.validateServiceTokenPayload(
      token,
      expectedClaims,
    );
    if (validateServiceTokenPayloadResult.isError) {
      return validateServiceTokenPayloadResult;
    }
    const { sub } = validateServiceTokenPayloadResult.value;

    const verifyResult = await this.tokenVerifier.verify(
      token,
      kid,
      stsBaseUrl,
    );
    if (verifyResult.isError) {
      return verifyResult;
    }

    return successResult(sub);
  }

  validateServiceTokenPayload(
    token: string,
    expectedClaims: ExpectedClaims,
  ): Result<{ sub: string }> {
    let payload;
    try {
      payload = decodeJwt(token);
    } catch {
      return errorResult({
        errorCategory: ErrorCategory.CLIENT_ERROR,
        errorMessage: "Failed to decode token payload",
      });
    }

    const currentTime = Math.floor(Date.now() / 1000);

    if (payload.nbf) {
      if (!this.hasValidNotBefore(payload, currentTime)) {
        return errorResult({
          errorCategory: ErrorCategory.CLIENT_ERROR,
          errorMessage: "Invalid not-before claim",
        });
      }
    }

    if (!this.hasValidIssuer(payload, expectedClaims.iss)) {
      return errorResult({
        errorCategory: ErrorCategory.CLIENT_ERROR,
        errorMessage: "Invalid issuer claim",
      });
    }

    if (!this.hasValidAudience(payload, expectedClaims.aud)) {
      return errorResult({
        errorCategory: ErrorCategory.CLIENT_ERROR,
        errorMessage: "Invalid audience claim",
      });
    }

    if (!this.hasValidScope(payload, expectedClaims.scope)) {
      return errorResult({
        errorCategory: ErrorCategory.CLIENT_ERROR,
        errorMessage: "Invalid scope claim",
      });
    }

    if (!this.hasValidSubject(payload)) {
      return errorResult({
        errorCategory: ErrorCategory.CLIENT_ERROR,
        errorMessage: "Invalid sub claim",
      });
    }

    if (!this.hasValidExpiry(payload, currentTime)) {
      return errorResult({
        errorCategory: ErrorCategory.CLIENT_ERROR,
        errorMessage: "Token expiry time is missing or is in the past",
      });
    }

    if (!this.hasValidIssuedAtTime(payload, currentTime)) {
      return errorResult({
        errorCategory: ErrorCategory.CLIENT_ERROR,
        errorMessage: "Token issued at time is missing or is in the future",
      });
    }

    return successResult({
      sub: payload.sub,
    });
  }

  hasValidIssuer(
    payload: object,
    expectedValue: string,
  ): payload is Record<"iss", string> {
    return (
      "iss" in payload &&
      typeof payload.iss === "string" &&
      payload.iss === expectedValue
    );
  }

  hasValidAudience(
    payload: object,
    expectedValue: string,
  ): payload is Record<"aud", string> {
    return "aud" in payload && payload.aud === expectedValue;
  }

  hasValidScope(
    payload: object,
    expectedValue: string,
  ): payload is Record<"scope", string> {
    return "scope" in payload && payload.scope === expectedValue;
  }

  hasValidSubject(payload: object): payload is Record<"sub", string> {
    return "sub" in payload && typeof payload.sub === "string";
  }

  hasValidIssuedAtTime(
    payload: object,
    currentTime: number,
  ): payload is Record<"iat", number> {
    return (
      "iat" in payload &&
      typeof payload.iat === "number" &&
      currentTime >= payload.iat
    );
  }

  hasValidExpiry(
    payload: object,
    currentTime: number,
  ): payload is Record<"exp", number> {
    return (
      "exp" in payload &&
      typeof payload.exp === "number" &&
      currentTime < payload.exp
    );
  }

  hasValidNotBefore(
    payload: object,
    currentTime: number,
  ): payload is Record<"nbf", number> {
    return (
      "nbf" in payload &&
      typeof payload.nbf === "number" &&
      currentTime > payload.nbf
    );
  }

  validateServiceTokenHeader(token: string): Result<{ kid: string }> {
    let header;
    try {
      header = decodeProtectedHeader(token);
    } catch {
      return errorResult({
        errorCategory: ErrorCategory.CLIENT_ERROR,
        errorMessage: "Failed to decode token header",
      });
    }

    if (!this.hasValidKid(header)) {
      return errorResult({
        errorCategory: ErrorCategory.CLIENT_ERROR,
        errorMessage: "Invalid kid claim",
      });
    }

    return successResult({
      kid: header.kid,
    });
  }

  hasValidKid(decodedHeader: object): decodedHeader is Record<"kid", string> {
    return "kid" in decodedHeader && typeof decodedHeader.kid === "string";
  }
}
