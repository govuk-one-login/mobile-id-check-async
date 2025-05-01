import {
  GetPublicKeyCommand,
  GetPublicKeyCommandOutput,
  KMSClient,
} from "@aws-sdk/client-kms";
import { mockClient } from "aws-sdk-client-mock";
import { JwksBuilder } from "../jwksBuilder";
import { createPublicKey } from "node:crypto";
import { ErrorCategory } from "../../../utils/result";
import { Jwks } from "../../../types/jwks";

const mockKmsClient = mockClient(KMSClient);

describe("JWKS Builder", () => {
  const keyIds = [
    "mockEncryptionKeyId",
    "mockVerifiableCredentialSigningKeyId",
  ];
  let jwksBuilder: JwksBuilder;

  beforeEach(() => {
    jwksBuilder = new JwksBuilder(keyIds);
  });

  afterEach(() => {
    mockKmsClient.reset();
  });

  describe("Given an error happens getting the public key from KMS", () => {
    it("Returns an error response", async () => {
      mockKmsClient
        .on(GetPublicKeyCommand)
        .rejects(new Error("Failed to get public key from KMS"));

      const buildJwksResponse = await jwksBuilder.buildJwks();

      expect(buildJwksResponse.isError).toBe(true);
      expect(buildJwksResponse.value).toStrictEqual({
        errorMessage: "Error from KMS",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    });
  });

  describe("Given KMS successfully returns the public keys", () => {
    describe.each([
      [
        "PublicKey",
        {
          KeySpec: "RSA_2048",
          KeyUsage: "ENCRYPT_DECRYPT",
        } as GetPublicKeyCommandOutput,
      ],
      [
        "KeySpec",
        {
          PublicKey: new Uint8Array(),
          KeyUsage: "ENCRYPT_DECRYPT",
        } as GetPublicKeyCommandOutput,
      ],
      [
        "KeyUsage",
        {
          KeySpec: "RSA_2048",
          PublicKey: new Uint8Array(),
        } as GetPublicKeyCommandOutput,
      ],
    ])("When the KMS response does not include the %s key", (key, response) => {
      it("Returns an error response", async () => {
        mockKmsClient.on(GetPublicKeyCommand).resolves(response);

        const buildJwksResponse = await jwksBuilder.buildJwks();

        expect(buildJwksResponse.isError).toBe(true);
        expect(buildJwksResponse.value).toStrictEqual({
          errorMessage: "KMS response is missing required fields",
          errorCategory: ErrorCategory.SERVER_ERROR,
        });
      });
    });

    describe("When the KeyUsage is not supported", () => {
      it("Returns an error for unsupported key usage", async () => {
        mockKmsClient.on(GetPublicKeyCommand).resolves({
          KeyUsage: "IMPORT_KEY" as unknown,
          KeySpec: "RSA_2048",
          PublicKey: new Uint8Array(),
        } as GetPublicKeyCommandOutput);

        const buildJwksResponse = await jwksBuilder.buildJwks();

        expect(buildJwksResponse.isError).toBe(true);
        if (buildJwksResponse.isError) {
          expect(buildJwksResponse.value).toStrictEqual({
            errorMessage: "KMS key usage is not supported",
            errorCategory: ErrorCategory.SERVER_ERROR,
          });
        }
      });
    });

    describe("When the KeySpec is not supported", () => {
      it.each([
        {
          keyType: "RSA",
          keyUsage: "ENCRYPT_DECRYPT",
          keySpec: "RSA_4096",
        },
        {
          keyType: "EC",
          keyUsage: "SIGN_VERIFY",
          keySpec: "ECC_NIST_P384",
        },
      ])(
        "Returns an error for unsupported $keyType key spec",
        async ({ keyUsage, keySpec }) => {
          mockKmsClient.on(GetPublicKeyCommand).resolves({
            KeyUsage: keyUsage,
            KeySpec: keySpec,
            PublicKey: new Uint8Array(),
          } as GetPublicKeyCommandOutput);

          const buildJwksResponse = await jwksBuilder.buildJwks();

          expect(buildJwksResponse.isError).toBe(true);
          if (buildJwksResponse.isError) {
            expect(buildJwksResponse.value).toStrictEqual({
              errorMessage: "KMS key algorithm is not supported",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          }
        },
      );
    });

    describe("When the encryption key cannot be formatted as a JWK", () => {
      it("Returns an error response", async () => {
        mockKmsClient.on(GetPublicKeyCommand).resolves({
          KeyUsage: "ENCRYPT_DECRYPT",
          KeySpec: "RSA_2048",
          PublicKey: new Uint8Array(),
        } as GetPublicKeyCommandOutput);

        const buildJwksResponse = await jwksBuilder.buildJwks();

        expect(buildJwksResponse.isError).toBe(true);
        expect(buildJwksResponse.value).toStrictEqual({
          errorMessage: "Error formatting public key as JWK",
          errorCategory: ErrorCategory.SERVER_ERROR,
        });
      });
    });

    describe("When the signing key cannot be formatted as a JWK", () => {
      it("Returns an error response", async () => {
        mockKmsClient.on(GetPublicKeyCommand).resolves({
          KeyUsage: "SIGN_VERIFY",
          KeySpec: "ECC_NIST_P256",
          PublicKey: new Uint8Array(),
        } as GetPublicKeyCommandOutput);

        const buildJwksResponse = await jwksBuilder.buildJwks();

        expect(buildJwksResponse.isError).toBe(true);
        expect(buildJwksResponse.value).toStrictEqual({
          errorMessage: "Error formatting public key as JWK",
          errorCategory: ErrorCategory.SERVER_ERROR,
        });
      });
    });

    describe("Given the KMS public keys can be successfully formatted as JWKs", () => {
      it("Returns the JWKS with both encryption and signing keys", async () => {
        const mockEncryptionKey: Buffer = createPublicKey({
          key: {
            kty: "RSA",
            n: "kOBby1nEUcKc-94zIa2qCyqDSE1-2bLWkVjeF3DWY_0v2j9wlLSaR6asONen_HP40wftLOSPYRcKYv6Cjz3LOY7aQYznX14EXSgJxrDwQ7AleX2VS_HB34LMZEa3xmSSH7pLtw_vmJgCNss0zDQLCz1sQwZxlqphF18FdTTUrXbJ9Qk3xIrEzvL2naO2r6WoLBQ9tSr2Sz9TTcJQptfh6hOAHm66oPA6F9uCmbTDEQeI-wLiMMArtcKrGiPAFluo8f0qNkzLRMFIqyadnZ9OZ5u0-H_urOkmLJ2nbAnyTcO-9QeDlomdEMz3yEaJeUoq-jnPpVEfIbd8-07fl7M27w",
            e: "AQAB",
            use: "enc",
            alg: "RSA-OAEP-256",
            kid: "mock-encryption-key",
          },
          format: "jwk",
        }).export({ format: "der", type: "spki" });

        const mockSigningKey: Buffer = createPublicKey({
          key: {
            kty: "EC",
            x: "ZvtYNUEFSfoivixzC76PPJk-ka7pvAaidUiZpaHznC4",
            y: "01kuST7C4NRZlIPpBvuSrrRe9jyWfQtclSBNOv20y94",
            crv: "P-256",
            use: "sig",
            alg: "ES256",
            kid: "mock-signing-key",
          },
          format: "jwk",
        }).export({ format: "der", type: "spki" });

        mockKmsClient.on(GetPublicKeyCommand, { KeyId: keyIds[0] }).resolves({
          KeyUsage: "ENCRYPT_DECRYPT",
          KeySpec: "RSA_2048",
          PublicKey: new Uint8Array(mockEncryptionKey),
        });

        mockKmsClient.on(GetPublicKeyCommand, { KeyId: keyIds[1] }).resolves({
          KeyUsage: "SIGN_VERIFY",
          KeySpec: "ECC_NIST_P256",
          PublicKey: new Uint8Array(mockSigningKey),
        });

        const buildJwksResult = await jwksBuilder.buildJwks();
        const jwks = buildJwksResult.value as Jwks;

        expect(buildJwksResult.isError).toEqual(false);
        expect(jwks.keys.length).toBe(2);

        expect(jwks.keys[0]).toMatchObject({
          alg: "RSA-OAEP-256",
          use: "enc",
          kid: keyIds[0],
          kty: "RSA",
        });
        expect(jwks.keys[0]).toHaveProperty("n");
        expect(jwks.keys[0]).toHaveProperty("e");

        expect(jwks.keys[1]).toMatchObject({
          alg: "ES256",
          use: "sig",
          kid: keyIds[1],
          kty: "EC",
          crv: "P-256",
        });
        expect(jwks.keys[1]).toHaveProperty("x");
        expect(jwks.keys[1]).toHaveProperty("y");
      });
    });
  });
});
