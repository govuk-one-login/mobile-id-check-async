import {
  GetPublicKeyCommand,
  GetPublicKeyCommandOutput,
  KMSClient,
} from "@aws-sdk/client-kms";
import { mockClient } from "aws-sdk-client-mock";
import { JwksBuilder } from "../jwksBuilder";
import { createPublicKey } from "node:crypto";

const mockKmsClient = mockClient(KMSClient);

describe("JWKS Builder", () => {
  const keyId = "test-key-id";
  let jwksBuilder: JwksBuilder;

  beforeEach(() => {
    jwksBuilder = new JwksBuilder(keyId);
  });

  afterEach(() => {
    mockKmsClient.reset();
  });

  describe("Given an error happens getting the public key from KMS", () => {
    it("Returns an error response", async () => {
      mockKmsClient
        .on(GetPublicKeyCommand)
        .rejects(new Error("Failed to get public key from KMS"));

      const buildJwksResponse = jwksBuilder.buildJwks();

      expect((await buildJwksResponse).isError).toBe(true);
      expect((await buildJwksResponse).value).toStrictEqual({
        errorMessage: "Error from KMS",
        errorCategory: "SERVER_ERROR",
      });
    });
  });

  describe("Given KMS successfully returns the public key", () => {
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

        const buildJwksResponse = jwksBuilder.buildJwks();

        expect((await buildJwksResponse).isError).toBe(true);
        expect((await buildJwksResponse).value).toStrictEqual({
          errorMessage: "KMS response is missing required fields",
          errorCategory: "SERVER_ERROR",
        });
      });
    });

    describe("When the KeyUsage is not ENCRYPT_DECRYPT", () => {
      it("Returns an error response", async () => {
        mockKmsClient.on(GetPublicKeyCommand).resolves({
          KeyUsage: "SIGN_VERIFY",
          KeySpec: "RSA_2048",
          PublicKey: new Uint8Array(),
        } as GetPublicKeyCommandOutput);

        const buildJwksResponse = jwksBuilder.buildJwks();

        expect((await buildJwksResponse).isError).toBe(true);
        expect((await buildJwksResponse).value).toStrictEqual({
          errorMessage: "KMS key usage is not supported",
          errorCategory: "SERVER_ERROR",
        });
      });
    });

    describe("When the KeySpec is not RSA_2048", () => {
      it("Returns an error response", async () => {
        mockKmsClient.on(GetPublicKeyCommand).resolves({
          KeyUsage: "ENCRYPT_DECRYPT",
          KeySpec: "RSA_4096",
          PublicKey: new Uint8Array(),
        } as GetPublicKeyCommandOutput);

        const buildJwksResponse = jwksBuilder.buildJwks();

        expect((await buildJwksResponse).isError).toBe(true);
        expect((await buildJwksResponse).value).toStrictEqual({
          errorMessage: "KMS key algorithm is not supported",
          errorCategory: "SERVER_ERROR",
        });
      });
    });

    describe("When the public key cannot be formatted as a JWK", () => {
      it("Returns an error response", async () => {
        mockKmsClient.on(GetPublicKeyCommand).resolves({
          KeyUsage: "ENCRYPT_DECRYPT",
          KeySpec: "RSA_2048",
          PublicKey: new Uint8Array(),
        } as GetPublicKeyCommandOutput);

        const buildJwksResponse = jwksBuilder.buildJwks();

        expect((await buildJwksResponse).isError).toBe(true);
        expect((await buildJwksResponse).value).toStrictEqual({
          errorMessage: "Error formatting public key as JWK",
          errorCategory: "SERVER_ERROR",
        });
      });
    });

    describe("Given the KMS public key can be successfully formatted as a JWK", () => {
      it("Returns the JWKS", async () => {
        const mockPublicKey: Buffer = createPublicKey({
          key: {
            kty: "RSA",
            n: "kOBby1nEUcKc-94zIa2qCyqDSE1-2bLWkVjeF3DWY_0v2j9wlLSaR6asONen_HP40wftLOSPYRcKYv6Cjz3LOY7aQYznX14EXSgJxrDwQ7AleX2VS_HB34LMZEa3xmSSH7pLtw_vmJgCNss0zDQLCz1sQwZxlqphF18FdTTUrXbJ9Qk3xIrEzvL2naO2r6WoLBQ9tSr2Sz9TTcJQptfh6hOAHm66oPA6F9uCmbTDEQeI-wLiMMArtcKrGiPAFluo8f0qNkzLRMFIqyadnZ9OZ5u0-H_urOkmLJ2nbAnyTcO-9QeDlomdEMz3yEaJeUoq-jnPpVEfIbd8-07fl7M27w",
            e: "AQAB",
            use: "enc",
            alg: "RS256",
            kid: "da48d440-8e51-4383-9a3a-b91ce5adcf2a",
          },
          format: "jwk",
        }).export({ format: "der", type: "spki" });
        mockKmsClient.on(GetPublicKeyCommand).resolves({
          KeyUsage: "ENCRYPT_DECRYPT",
          KeySpec: "RSA_2048",
          PublicKey: new Uint8Array(mockPublicKey),
        } as GetPublicKeyCommandOutput);

        const buildJwksResponse = jwksBuilder.buildJwks();

        expect((await buildJwksResponse).isError).toBe(false);
        expect((await buildJwksResponse).value).toStrictEqual({
          keys: [
            {
              alg: "RS256",
              e: "AQAB",
              kid: keyId,
              kty: "RSA",
              n: "kOBby1nEUcKc-94zIa2qCyqDSE1-2bLWkVjeF3DWY_0v2j9wlLSaR6asONen_HP40wftLOSPYRcKYv6Cjz3LOY7aQYznX14EXSgJxrDwQ7AleX2VS_HB34LMZEa3xmSSH7pLtw_vmJgCNss0zDQLCz1sQwZxlqphF18FdTTUrXbJ9Qk3xIrEzvL2naO2r6WoLBQ9tSr2Sz9TTcJQptfh6hOAHm66oPA6F9uCmbTDEQeI-wLiMMArtcKrGiPAFluo8f0qNkzLRMFIqyadnZ9OZ5u0-H_urOkmLJ2nbAnyTcO-9QeDlomdEMz3yEaJeUoq-jnPpVEfIbd8-07fl7M27w",
              use: "enc",
            },
          ],
        });
      });
    });
  });
});
