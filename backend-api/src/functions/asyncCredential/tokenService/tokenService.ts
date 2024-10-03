import format from "ecdsa-sig-formatter";
import { KMSClient, VerifyCommand } from "@aws-sdk/client-kms";
import { IJwtPayload } from "../../types/jwt";
import { errorResult, Result, successResult } from "../../utils/result";

export class TokenService implements IDecodeToken, IVerifyTokenSignature {
  getDecodedToken(config: IDecodeTokenConfig): Result<IDecodedToken> {
    const encodedJwt = config.authorizationHeader;

    const decodedJwtResult = this.decodeToken(encodedJwt);
    if (decodedJwtResult.isError) {
      return errorResult(decodedJwtResult.value);
    }
    const jwtPayload = decodedJwtResult.value;

    const validateTokenClaimsResult = this.validateTokenClaims(
      jwtPayload,
      config.issuer,
    );
    if (validateTokenClaimsResult.isError) {
      return errorResult(validateTokenClaimsResult.value);
    }

    return successResult({
      encodedJwt,
      jwtPayload,
    });
  }

  async verifyTokenSignature(
    keyId: string,
    jwt: string,
  ): Promise<Result<null>> {
    const [header, payload, signature] = jwt.split(".");
    const kmsClient = new KMSClient();
    const verifyCommand = new VerifyCommand({
      KeyId: keyId,
      SigningAlgorithm: "ECDSA_SHA_256",
      Signature: format.joseToDer(signature, "ES256"),
      Message: Buffer.from(`${header}.${payload}`),
      MessageType: "RAW",
    });

    try {
      await kmsClient.send(verifyCommand);
    } catch {
      return errorResult({
        errorMessage: "Signature could not be verified",
        errorCategory: "CLIENT_ERROR",
      });
    }

    return successResult(null);
  }

  private decodeToken(encodedJwt: string): Result<IJwtPayload> {
    const payload = encodedJwt.split(".")[1];
    let jwtPayload;
    try {
      jwtPayload = JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
    } catch {
      return errorResult({
        errorMessage: "JWT payload not valid JSON",
        errorCategory: "CLIENT_ERROR",
      });
    }

    return successResult(jwtPayload);
  }

  private validateTokenClaims(
    jwtPayload: IJwtPayload,
    issuer: string,
  ): Result<null> {
    if (!jwtPayload.exp) {
      return errorResult({
        errorMessage: "Missing exp claim",
        errorCategory: "CLIENT_ERROR",
      });
    }

    if (jwtPayload.exp <= Math.floor(Date.now() / 1000)) {
      return errorResult({
        errorMessage: "exp claim is in the past",
        errorCategory: "CLIENT_ERROR",
      });
    }

    if (jwtPayload.iat) {
      if (jwtPayload.iat >= Math.floor(Date.now() / 1000)) {
        return errorResult({
          errorMessage: "iat claim is in the future",
          errorCategory: "CLIENT_ERROR",
        });
      }
    }

    if (jwtPayload.nbf) {
      if (jwtPayload.nbf >= Math.floor(Date.now() / 1000)) {
        return errorResult({
          errorMessage: "nbf claim is in the future",
          errorCategory: "CLIENT_ERROR",
        });
      }
    }

    if (!jwtPayload.iss) {
      return errorResult({
        errorMessage: "Missing iss claim",
        errorCategory: "CLIENT_ERROR",
      });
    }

    if (jwtPayload.iss !== issuer) {
      return errorResult({
        errorMessage: "iss claim does not match ISSUER environment variable",
        errorCategory: "CLIENT_ERROR",
      });
    }

    if (!jwtPayload.scope) {
      return errorResult({
        errorMessage: "Missing scope claim",
        errorCategory: "CLIENT_ERROR",
      });
    }

    if (jwtPayload.scope !== "dcmaw.session.async_create") {
      return errorResult({
        errorMessage: "Invalid scope claim",
        errorCategory: "CLIENT_ERROR",
      });
    }

    if (!jwtPayload.client_id) {
      return errorResult({
        errorMessage: "Missing client_id claim",
        errorCategory: "CLIENT_ERROR",
      });
    }

    if (!jwtPayload.aud) {
      return errorResult({
        errorMessage: "Missing aud claim",
        errorCategory: "CLIENT_ERROR",
      });
    }

    return successResult(null);
  }
}

export interface IDecodeToken {
  getDecodedToken: (
    config: IDecodeTokenConfig,
  ) => Result<{ encodedJwt: string; jwtPayload: IJwtPayload }>;
}

export interface IVerifyTokenSignature {
  verifyTokenSignature: (keyId: string, jwt: string) => Promise<Result<null>>;
}

export interface IDecodedToken {
  encodedJwt: string;
  jwtPayload: IJwtPayload;
}

export interface IDecodeTokenConfig {
  authorizationHeader: string;
  issuer: string;
}
