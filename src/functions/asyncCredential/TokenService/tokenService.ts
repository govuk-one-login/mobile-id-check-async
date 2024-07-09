import format from "ecdsa-sig-formatter";
import { LogOrValue, log, value } from "../../types/logOrValue";
import { KMSClient, VerifyCommand } from "@aws-sdk/client-kms";

export interface IValidateTokenPayload {
  validateTokenPayload: (keyId: string, jwt: string) => LogOrValue<null>;
}

export interface IVerifyTokenSignature {
  verifyTokenSignature: (
    keyId: string,
    jwt: string,
  ) => Promise<LogOrValue<null>>;
}

export class TokenService implements IVerifyTokenSignature {
  async verifyTokenSignature(
    keyId: string,
    jwt: string,
  ): Promise<LogOrValue<null>> {
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
      return log("TOKEN_SIGNATURE_INVALID");
    }

    return value(null);
  }
}
