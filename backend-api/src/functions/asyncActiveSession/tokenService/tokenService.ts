import { errorResult, Result, successResult } from "../../utils/result";
import { decodeJwt } from "jose";
import { ITokenVerifier, TokenVerifier } from "./tokenVerifier";

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
  private jwksUri: string;

  constructor(jwksUri: string, dependencies = tokenServiceDependencies) {
    this.jwksUri = jwksUri;
    this.tokenVerifier = dependencies.tokenVerifier;
  }

  async getSubFromServiceToken(
    jwt: string,
    expectedClaims: ExpectedClaims,
  ): Promise<Result<string>> {
    let payload;
    try {
      payload = this.validateServiceTokenClaims(jwt, expectedClaims);
    } catch (error) {
      return errorResult({
        errorCategory: "CLIENT_ERROR",
        errorMessage: `${error}`,
      });
    }

    const verifyResult = await this.tokenVerifier.verify(jwt, this.jwksUri);

    if (verifyResult.isError) {
      return verifyResult;
    }

    return successResult(payload.sub);
  }

  validateServiceTokenClaims(
    serviceToken: string,
    expectedClaims: ExpectedClaims,
  ) {
    let payload;
    try {
      payload = decodeJwt(serviceToken);
    } catch {
      throw new Error("Invalid token");
    }

    const currentTime = Math.floor(Date.now() / 1000);

    if (payload.nbf) {
      if (!this.hasValidNotBefore(payload, currentTime)) {
        throw new Error("Invalid not-before claim");
      }
    }

    if (!this.hasValidIssuer(payload, expectedClaims.iss)) {
      throw new Error("Invalid issuer claim");
    }

    if (!this.hasValidAudience(payload, expectedClaims.iss)) {
      throw new Error("Invalid audience claim");
    }

    if (!this.hasValidScope(payload, expectedClaims.scope)) {
      throw new Error("Invalid scope claim");
    }

    if (!this.hasValidSubject(payload)) {
      throw new Error("Invalid sub claim");
    }

    if (!this.hasValidExpiry(payload, currentTime)) {
      throw new Error("Token expiry time is in the past");
    }

    if (!this.hasValidIssuedAtTime(payload, currentTime)) {
      throw new Error("Token issue at time is in the future");
    }

    return payload;
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
      currentTime < payload.nbf
    );
  }
}

export interface ITokenService {
  getSubFromServiceToken: (
    token: string,
    expectedClaims: ExpectedClaims,
  ) => Promise<Result<string>>;
}
