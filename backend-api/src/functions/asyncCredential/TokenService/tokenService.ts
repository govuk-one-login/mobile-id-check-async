import format from "ecdsa-sig-formatter";
import { KMSClient, VerifyCommand } from "@aws-sdk/client-kms";
import {
  ErrorOrSuccess,
  errorResponse,
  successResponse,
} from "../../types/errorOrValue";

export interface IVerifyTokenSignature {
  verifyTokenSignature: (
    keyId: string,
    jwt: string,
  ) => Promise<ErrorOrSuccess<null>>;
}

export class TokenService implements IVerifyTokenSignature {
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
