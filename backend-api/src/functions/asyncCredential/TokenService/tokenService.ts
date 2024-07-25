import format from "ecdsa-sig-formatter";
import { KMSClient, VerifyCommand } from "@aws-sdk/client-kms";
import {
  ErrorOrSuccess,
  errorResponse,
  successResponse,
} from "../../types/errorOrValue";
import { IJwtPayload } from "../../types/jwt";

export class TokenService implements IDecodeToken, IVerifyTokenSignature {
  getDecodedToken(
    authorizationHeader: string,
    issuer: string,
  ): ErrorOrSuccess<IDecodedToken> {
    const encodedJwt = authorizationHeader.split(" ")[1];
    const payload = encodedJwt.split(".")[1];
    let jwtPayload;
    try {
      jwtPayload = JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
    } catch (error) {
      return errorResponse("JWT payload not valid JSON");
    }

    if (!jwtPayload.exp) {
      return errorResponse("Missing exp claim");
    }

    if (jwtPayload.exp <= Math.floor(Date.now() / 1000)) {
      return errorResponse("exp claim is in the past");
    }

    if (jwtPayload.iat) {
      if (jwtPayload.iat >= Math.floor(Date.now() / 1000)) {
        return errorResponse("iat claim is in the future");
      }
    }

    if (jwtPayload.nbf) {
      if (jwtPayload.nbf >= Math.floor(Date.now() / 1000)) {
        return errorResponse("nbf claim is in the future");
      }
    }

    if (!jwtPayload.iss) {
      return errorResponse("Missing iss claim");
    }

    if (jwtPayload.iss !== issuer) {
      return errorResponse(
        "iss claim does not match ISSUER environment variable",
      );
    }

    if (!jwtPayload.scope) {
      return errorResponse("Missing scope claim");
    }

    if (jwtPayload.scope !== "dcmaw.session.async_create") {
      return errorResponse("Invalid scope claim");
    }

    if (!jwtPayload.client_id) {
      return errorResponse("Missing client_id claim");
    }

    if (!jwtPayload.aud) {
      return errorResponse("Missing aud claim");
    }

    return successResponse({
      encodedJwt,
      jwtPayload,
    });
  }

  async verifyTokenSignature(
    keyId: string,
    jwt: string,
  ): Promise<ErrorOrSuccess<null>> {
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
      return errorResponse("Signature is invalid");
    }

    return successResponse(null);
  }
}

export interface IDecodeToken {
  getDecodedToken: (
    authorizationHeader: string,
    issuer: string,
  ) => ErrorOrSuccess<{ encodedJwt: string; jwtPayload: IJwtPayload }>;
}

export interface IVerifyTokenSignature {
  verifyTokenSignature: (
    keyId: string,
    jwt: string,
  ) => Promise<ErrorOrSuccess<null>>;
}

export interface IDecodedToken {
  encodedJwt: string;
  jwtPayload: IJwtPayload;
}
