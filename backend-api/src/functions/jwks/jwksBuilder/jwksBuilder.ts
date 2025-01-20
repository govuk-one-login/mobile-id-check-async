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
} from "../../types/jwks";

export class JwksBuilder implements IJwksBuilder {
  constructor(
    private readonly keyId: string,
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
    const jwks: Jwks = {
      keys: [],
    };
    const result = await this.getPublicKeyAsJwk();
    if (result.isError) {
      return result;
    }

    jwks.keys.push(result.value);
    return successResult(jwks);
  }

  async getPublicKeyAsJwk(): Promise<Result<EncryptionJwk>> {
    let getPublicKeyOutput: GetPublicKeyCommandOutput;
    try {
      const command = new GetPublicKeyCommand({
        KeyId: this.keyId,
      });
      getPublicKeyOutput = await this.kmsClient.send(command);
    } catch {
      return errorResult({
        errorMessage: "Error from KMS",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }

    return this.formatAsJwk(getPublicKeyOutput);
  }

  formatAsJwk(
    getPublicKeyOutput: GetPublicKeyCommandOutput,
  ): Result<EncryptionJwk> {
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
    if (keyUsage !== "ENCRYPT_DECRYPT") {
      return errorResult({
        errorMessage: "KMS key usage is not supported",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }

    const encryptionKeyToJoseMap = ENCRYPTION_KEY_TO_JOSE_MAP[keyUsage];

    const keySpec = getPublicKeyOutput.KeySpec as string;
    if (keySpec !== encryptionKeyToJoseMap.KEY_SPEC) {
      return errorResult({
        errorMessage: "KMS key algorithm is not supported",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }

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
    return successResult({
      ...publicKeyAsJwk,
      use: encryptionKeyToJoseMap.USE,
      alg: encryptionKeyToJoseMap.ALGORITHM,
      kid: this.keyId,
    });
  }
}

export interface IJwksBuilder {
  buildJwks: () => Promise<Result<Jwks>>;
  getPublicKeyAsJwk: () => Promise<Result<EncryptionJwk>>;
  formatAsJwk: (
    getPublicKeyOutput: GetPublicKeyCommandOutput,
  ) => Result<EncryptionJwk>;
}

export interface EncryptionKeyToJose {
  ENCRYPT_DECRYPT: EncryptDecrypt;
}

export interface EncryptDecrypt {
  USE: EncryptionJwkUse;
  KEY_SPEC: string;
  ALGORITHM: EncryptionJwkAlgorithm;
}

const ENCRYPTION_KEY_TO_JOSE_MAP: EncryptionKeyToJose = {
  ENCRYPT_DECRYPT: {
    USE: "enc",
    KEY_SPEC: "RSA_2048",
    ALGORITHM: "RSA-OAEP-256",
  },
};
