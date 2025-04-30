import {
  GetPublicKeyCommand,
  GetPublicKeyCommandOutput,
  KMSClient,
} from "@aws-sdk/client-kms";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import {
  ErrorCategory,
  errorResult,
  Result,
  successResult,
} from "../../utils/result";
import { createPublicKey } from "node:crypto";
import {
  EncryptionJwk,
  EncryptionJwkAlgorithm,
  EncryptionJwkUse,
  Jwks,
  SigningJwk,
  SigningJwkAlgorithm,
  SigningJwkUse,
} from "../../types/jwks";

export class JwksBuilder implements IJwksBuilder {
  constructor(
    private readonly keyIds: string[],
    private readonly kmsClient = new KMSClient({
      region: "eu-west-2",
      maxAttempts: 2,
      requestHandler: new NodeHttpHandler({
        connectionTimeout: 5000,
        requestTimeout: 5000,
      }),
    }),
  ) {}

  async buildJwks(): Promise<Result<Jwks>> {
    console.log("Building JWKS", this.keyIds);
    const jwks: Jwks = {
      keys: [],
    };

    for (const keyId of this.keyIds) {
      const result = await this.getPublicKeyAsJwk(keyId);
      if (result.isError) {
        return result;
      }
      jwks.keys.push(result.value);
    }

    return successResult(jwks);
  }

  async getPublicKeyAsJwk(
    keyId: string,
  ): Promise<Result<EncryptionJwk | SigningJwk>> {
    console.log("Getting public key from KMS", keyId);
    let getPublicKeyOutput: GetPublicKeyCommandOutput;
    try {
      const command = new GetPublicKeyCommand({
        KeyId: keyId,
      });
      console.log("Sending command to KMS", command);
      getPublicKeyOutput = await this.kmsClient.send(command);
      console.log("Received response from KMS", getPublicKeyOutput);
    } catch (error) {
      console.error("Error getting public key from KMS", error);
      return errorResult({
        errorMessage: "Error from KMS",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }

    return this.formatAsJwk(getPublicKeyOutput, keyId);
  }

  formatAsJwk(
    getPublicKeyOutput: GetPublicKeyCommandOutput,
    keyId: string,
  ): Result<EncryptionJwk | SigningJwk> {
    if (
      !getPublicKeyOutput.KeySpec ||
      !getPublicKeyOutput.KeyUsage ||
      !getPublicKeyOutput.PublicKey
    ) {
      return errorResult({
        errorMessage: "KMS response is missing required fields",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }

    const keyUsage = getPublicKeyOutput.KeyUsage;
    const keySpec = getPublicKeyOutput.KeySpec as string;

    // Validate key specs
    if (keyUsage === "ENCRYPT_DECRYPT") {
      if (keySpec !== "RSA_2048") {
        return errorResult({
          errorMessage: "KMS key algorithm is not supported",
          errorCategory: ErrorCategory.SERVER_ERROR,
        });
      }
    } else if (keyUsage === "SIGN_VERIFY") {
      if (keySpec !== "ECC_NIST_P256") {
        return errorResult({
          errorMessage: "KMS key algorithm is not supported",
          errorCategory: ErrorCategory.SERVER_ERROR,
        });
      }
    } else {
      return errorResult({
        errorMessage: "KMS key usage is not supported",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }

    // Format the public key
    let publicKeyAsJwk: JsonWebKey;
    try {
      publicKeyAsJwk = createPublicKey({
        key: Buffer.from(getPublicKeyOutput.PublicKey),
        type: "spki",
        format: "der",
      }).export({ format: "jwk" });
    } catch {
      return errorResult({
        errorMessage: "Error formatting public key as JWK",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }

    // Return the appropriate key type
    if (keyUsage === "ENCRYPT_DECRYPT") {
      const encryptionJwk: EncryptionJwk = {
        ...publicKeyAsJwk,
        use: "enc",
        alg: "RSA-OAEP-256",
        kid: keyId,
      };
      return successResult(encryptionJwk);
    } else {
      const signingJwk: SigningJwk = {
        ...publicKeyAsJwk,
        use: "sig",
        alg: "ES256",
        kid: keyId,
      };
      return successResult(signingJwk);
    }
  }
}

export interface IJwksBuilder {
  buildJwks: () => Promise<Result<Jwks>>;
  getPublicKeyAsJwk: (
    keyId: string,
  ) => Promise<Result<EncryptionJwk | SigningJwk>>;
  formatAsJwk: (
    getPublicKeyOutput: GetPublicKeyCommandOutput,
    keyId: string,
  ) => Result<EncryptionJwk | SigningJwk>;
}

export interface EncryptionKeyToJose {
  ENCRYPT_DECRYPT: EncryptDecrypt;
  SIGN_VERIFY: SignVerify;
}

export interface EncryptDecrypt {
  USE: EncryptionJwkUse;
  KEY_SPEC: string;
  ALGORITHM: EncryptionJwkAlgorithm;
}

export interface SignVerify {
  USE: SigningJwkUse;
  KEY_SPEC: string;
  ALGORITHM: SigningJwkAlgorithm;
}
