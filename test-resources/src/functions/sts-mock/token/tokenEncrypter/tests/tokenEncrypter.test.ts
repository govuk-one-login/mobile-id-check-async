import { describe, expect, it, vi } from "vitest";
import {
  emptyFailure,
  ErrorCategory,
  successResult,
} from "../../../../common/utils/result";
import { TokenEncrypter } from "../tokenEncrypter";
import { IGetKeys } from "../../../../common/jwks/JwksCache/types";

const mockMatchingJwk = {
  kty: "RSA",
  n: "0wLh4PMAjSt17zLNFw9nnBdV901AWp0uuHQzGaz1-Wz1lAs-jN7nI90sQAyiv8MDlYWLrfUZKcQAAA0yjISp9UyTr8qgqsyAKiFBIcnoH7l4qV-U-VXe3rcMjr5BzrKdVK664YiF9coGaal-QDDd1VY0fvvom3DhGnh8MoezBQPKl6pynIaSiDHZUdSe8B9LdsjsKHt4SujGRR_QlERYISC0s4pCQu2gA9qsP-pFDfcklbLtskFtWa_utiPe48Y5xgrhj5r-hMz9Zi4R55mX6nymC9gypk7q6iiXGEQcMzxPMy0kgF4437PqA-0GmjJE24pGmVhnr33UL2i0tsfviw",
  e: "AQAB",
  use: "enc",
  alg: "RSA-OAEP-256",
  kid: "456d2da6-9ca8-4e1d-b8c8-081109d73015",
};

const mockSuccessfulGetKeys: IGetKeys = vi
  .fn()
  .mockResolvedValue(successResult({ keys: [mockMatchingJwk] }));

describe("Token Encrypter", () => {
  const mockJwksUri = "mockUrl.gov.uk/.well-known/jwks.json";
  const mockJwt = "header.payload.signature";

  describe("Given getJwks returns an error", () => {
    it("Returns an error response", async () => {
      const tokenEncrypter = new TokenEncrypter(
        mockJwksUri,
        vi.fn().mockResolvedValue(emptyFailure()),
      );

      const result = await tokenEncrypter.encrypt(mockJwt);

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage: "Failed to get JWKS",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    });
  });

  describe("Given the JWKS does not contain an encryption JWK", () => {
    it("Returns an error response", async () => {
      const tokenEncrypter = new TokenEncrypter(
        mockJwksUri,
        vi
          .fn()
          .mockResolvedValue(
            successResult({ keys: [{ kty: "RSA", use: "sig" }] }),
          ),
      );

      const result = await tokenEncrypter.encrypt(mockJwt);

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage: "No encryption key in JWKS",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    });
  });

  describe("Given the encryption JWK is invalid and cannot be parsed as a KeyObject", () => {
    it("Returns an error response", async () => {
      const tokenEncrypter = new TokenEncrypter(
        mockJwksUri,
        vi
          .fn()
          .mockResolvedValue(
            successResult({ keys: [{ kty: "RSA", use: "enc" }] }),
          ),
      );

      const result = await tokenEncrypter.encrypt(mockJwt);

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage: "Error creating public encryption key",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    });
  });

  /*
  This tests what happens in our codebase when 'jose.encrypt' throws an error. The intention is not to test the library
  behaviour but the code behaviour when an error is thrown while trying to encrypt the token. In the test below, the
  JWK type is not compatible with the required encryption algorithm, which causes 'encrypt' to throw an error.
  */
  describe("Given there is an unexpected error encrypting the JWT", () => {
    it("Returns an error response", async () => {
      const tokenEncrypter = new TokenEncrypter(
        mockJwksUri,
        vi.fn().mockResolvedValue(
          successResult({
            keys: [
              {
                kty: "EC",
                x: "-JBGGl6V4K-9VJZ_UfPljiHlteQCqTwbbMHEAxv0_NA",
                y: "ZgDwVZCrtEHfdrJwgq3n7a2pdPUFLabCYLUu6Un3VXE",
                crv: "P-256",
                kid: "SNFJEFlxy-FxCkRtvj1VD38VuotQ-ta6a2w7p4j6jhY",
                use: "enc",
                alg: "ES256",
              },
            ],
          }),
        ),
      );

      const result = await tokenEncrypter.encrypt(mockJwt);

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage: "Error encrypting token",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    });
  });

  describe("Given the JWT is encrypted successfully", () => {
    it("Returns a success response with the JWE", async () => {
      const tokenEncrypter = new TokenEncrypter(
        mockJwksUri,
        mockSuccessfulGetKeys,
      );
      const result = await tokenEncrypter.encrypt(mockJwt);

      const resultValue = result.value as string;

      expect(result.isError).toBe(false);
      expect(resultValue.split(".")).toHaveLength(5);
      expect(
        resultValue.startsWith(
          "eyJhbGciOiJSU0EtT0FFUC0yNTYiLCJlbmMiOiJBMjU2R0NNIn0",
        ),
      ).toBe(true);
    });
  });
});
