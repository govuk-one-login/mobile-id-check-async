import { errorResult, Result, successResult } from "../../utils/result";
import { decodeJwt } from "jose";

export type ExpectedClaims = {
  aud: string;
  iss: string;
  scope: "idCheck.activeSession.read";
};

export class TokenService implements ITokenService {
  private readonly jwksUri: string;
  // private readonly verifyTokenSignature: ITokenVerifier

  constructor(jwksUri: string) {
    this.jwksUri = jwksUri;
    // this.verifyTokenSignature = new TokenVerifier(jwksUri)
  }

  async getSubFromServiceToken(
    token: string,
    expectedClaims: ExpectedClaims,
  ): Promise<Result<string>> {
    let payload;
    try {
      payload = this.validateServiceTokenClaims(token, expectedClaims);
    } catch (error) {
      return errorResult({
        errorCategory: "CLIENT_ERROR",
        errorMessage: `Invalid token - ${error}`,
      });
    }

    // try {
    //     await verifyTokenSignature.verify();
    // } catch (error) {
    //     return errorResult({errorCategory: "CLIENT_ERROR", errorMessage: `Invalid token - ${error}` })
    // }

    return successResult(payload.sub);
  }

  validateServiceTokenClaims(
    serviceToken: string,
    expectedClaims: ExpectedClaims,
  ) {
    const payload = decodeJwt(serviceToken);

    const currentTime = Math.floor(Date.now() / 1000);

    if (payload.nbf) {
      if (!this.hasValidNbf(payload, currentTime)) {
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

    if (!this.hasValidExp(payload, currentTime)) {
      throw new Error("Token expiry time is in the past");
    }

    if (!this.hasValidIat(payload, currentTime)) {
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

  hasValidIat(
    payload: object,
    currentTime: number,
  ): payload is Record<"iat", number> {
    return (
      "iat" in payload &&
      typeof payload.iat === "number" &&
      currentTime >= payload.iat
    );
  }

  hasValidExp(
    payload: object,
    currentTime: number,
  ): payload is Record<"exp", number> {
    return (
      "exp" in payload &&
      typeof payload.exp === "number" &&
      currentTime < payload.exp
    );
  }

  hasValidNbf(
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
