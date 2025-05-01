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
    const jwks: Jwks = {
      keys: [],
    };

    for (const keyId of this.keyIds) {
      const getPublicKeyAsJwkResult = await this.getPublicKeyAsJwk(keyId);
      if (getPublicKeyAsJwkResult.isError) {
        return getPublicKeyAsJwkResult;
      }
      jwks.keys.push(getPublicKeyAsJwkResult.value);
    }

    return successResult(jwks);
  }

  async getPublicKeyAsJwk(
    keyId: string,
  ): Promise<Result<EncryptionJwk | SigningJwk>> {
    let getPublicKeyOutput: GetPublicKeyCommandOutput;
    try {
      const command = new GetPublicKeyCommand({
        KeyId: keyId,
      });
      getPublicKeyOutput = await this.kmsClient.send(command);
    } catch {
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
    const validationResult = this.validateKmsResponse(getPublicKeyOutput);
    if (validationResult.isError) {
      return validationResult;
    }

    const keyUsage = getPublicKeyOutput.KeyUsage!;
    const keySpec = getPublicKeyOutput.KeySpec as string;

    const keyTypeValidationResult = this.validateKeyType(keyUsage, keySpec);
    if (keyTypeValidationResult.isError) {
      return keyTypeValidationResult;
    }

    const jwkResult = this.convertToJwk(getPublicKeyOutput.PublicKey!);
    if (jwkResult.isError) {
      return jwkResult;
    }

    return keyUsage === "ENCRYPT_DECRYPT"
      ? this.createEncryptionJwk(jwkResult.value, keyId)
      : this.createSigningJwk(jwkResult.value, keyId);
  }

  private validateKmsResponse(
    getPublicKeyOutput: GetPublicKeyCommandOutput,
  ): Result<void> {
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

    return successResult(undefined);
  }

  private validateKeyType(keyUsage: string, keySpec: string): Result<void> {
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

    return successResult(undefined);
  }

  private convertToJwk(publicKey: Uint8Array): Result<JsonWebKey> {
    try {
      const publicKeyAsJwk = createPublicKey({
        key: Buffer.from(publicKey),
        type: "spki",
        format: "der",
      }).export({ format: "jwk" });

      return successResult(publicKeyAsJwk);
    } catch {
      return errorResult({
        errorMessage: "Error formatting public key as JWK",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }
  }

  private createEncryptionJwk(
    publicKeyAsJwk: JsonWebKey,
    keyId: string,
  ): Result<EncryptionJwk> {
    const encryptionJwk: EncryptionJwk = {
      ...publicKeyAsJwk,
      use: "enc" as EncryptionJwkUse,
      alg: "RSA-OAEP-256" as EncryptionJwkAlgorithm,
      kid: keyId,
    };

    return successResult(encryptionJwk);
  }

  private createSigningJwk(
    publicKeyAsJwk: JsonWebKey,
    keyId: string,
  ): Result<SigningJwk> {
    const signingJwk: SigningJwk = {
      ...publicKeyAsJwk,
      use: "sig" as SigningJwkUse,
      alg: "ES256" as SigningJwkAlgorithm,
      kid: keyId,
    };

    return successResult(signingJwk);
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
