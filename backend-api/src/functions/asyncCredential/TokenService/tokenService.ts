import format from "ecdsa-sig-formatter";
import { KMSClient, VerifyCommand } from "@aws-sdk/client-kms";
import { IJwtPayload } from "../../types/jwt";
import { errorResult, Result, successResult } from "../../utils/result";

export class TokenService implements IDecodeToken, IVerifyTokenSignature {
  getDecodedToken(config: IDecodeTokenConfig): Result<IDecodedToken> {
    const encodedJwt = config.authorizationHeader.split(" ")[1];

    const decodedJwtOrError = this.decodeToken(encodedJwt);
    if (decodedJwtOrError.isError) {
      return errorResult(decodedJwtOrError.value);
    }
    const jwtPayload = decodedJwtOrError.value as IJwtPayload;

    const validClaimsOrError = this.validateTokenClaims(
      jwtPayload,
      config.issuer,
    );
    if (validClaimsOrError.isError) {
      return errorResult(validClaimsOrError.value);
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
    });

    const result = await kmsClient.send(verifyCommand);
    if (result.SignatureValid !== true) {
      return errorResult("Signature is invalid");
    }

    return successResult(null);
  }

  private decodeToken(encodedJwt: string): Result<IJwtPayload> {
    const payload = encodedJwt.split(".")[1];
    let jwtPayload;
    try {
      jwtPayload = JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
    } catch (error) {
      return errorResult("JWT payload not valid JSON");
    }

    return successResult(jwtPayload);
  }

  private validateTokenClaims(
    jwtPayload: IJwtPayload,
    issuer: string,
  ): Result<null> {
    if (!jwtPayload.exp) {
      return errorResult("Missing exp claim");
    }

    if (jwtPayload.exp <= Math.floor(Date.now() / 1000)) {
      return errorResult("exp claim is in the past");
    }

    if (jwtPayload.iat) {
      if (jwtPayload.iat >= Math.floor(Date.now() / 1000)) {
        return errorResult("iat claim is in the future");
      }
    }

    if (jwtPayload.nbf) {
      if (jwtPayload.nbf >= Math.floor(Date.now() / 1000)) {
        return errorResult("nbf claim is in the future");
      }
    }

    if (!jwtPayload.iss) {
      return errorResult("Missing iss claim");
    }

    if (jwtPayload.iss !== issuer) {
      return errorResult("iss claim does not match ISSUER environment variable");
    }

    if (!jwtPayload.scope) {
      return errorResult("Missing scope claim");
    }

    if (jwtPayload.scope !== "dcmaw.session.async_create") {
      return errorResult("Invalid scope claim");
    }

    if (!jwtPayload.client_id) {
      return errorResult("Missing client_id claim");
    }

    if (!jwtPayload.aud) {
      return errorResult("Missing aud claim");
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
