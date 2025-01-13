import { JweDecrypter, JweDecrypterDependencies } from "../jweDecrypter";
import {
  MockSymmetricDecrypterFailure,
  MockSymmetricDecrypterSuccess,
} from "./mocks";
import {
  MockAsymmetricDecrypterClientError,
  MockAsymmetricDecrypterError,
  MockAsymmetricDecrypterSuccess,
} from "../../../adapters/tests/mocks";
import { ErrorCategory } from "../../../utils/result";

describe("Decrypt JWE", () => {
  let dependencies: JweDecrypterDependencies;

  beforeEach(() => {
    dependencies = {
      symmetricDecrypter: new MockSymmetricDecrypterSuccess(),
      asymmetricDecrypter: new MockAsymmetricDecrypterSuccess(),
    };
  });

  describe("Given the JWE does not consist of five components", () => {
    it("Returns an error result", async () => {
      const result = await new JweDecrypter("keyId", dependencies).decrypt(
        "protectedHeader.encryptedKey.iv.ciphertext",
      );

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage: "JWE is missing component",
        errorCategory: ErrorCategory.CLIENT_ERROR,
      });
    });
  });

  describe("Given a ClientError exception is thrown when trying to decrypt the CEK", () => {
    it("Returns a CLIENT_ERROR error result", async () => {
      dependencies.asymmetricDecrypter =
        new MockAsymmetricDecrypterClientError();
      const result = await new JweDecrypter("keyId", dependencies).decrypt(
        "protectedHeader.encryptedKey.iv.ciphertext.tag",
      );

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage:
          "Unable to decrypt encryption key - ClientError: Some mock asymmetric decryption client error",
        errorCategory: ErrorCategory.CLIENT_ERROR,
      });
    });
  });

  describe("Given any other exception is thrown when trying to decrypt the CEK", () => {
    it("Returns a SERVER_ERROR error result", async () => {
      dependencies.asymmetricDecrypter = new MockAsymmetricDecrypterError();
      const result = await new JweDecrypter("keyId", dependencies).decrypt(
        "protectedHeader.encryptedKey.iv.ciphertext.tag",
      );

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage:
          "Unable to decrypt encryption key - Error: Some mock asymmetric decryption error",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    });
  });

  describe("Given decrypting JWE fails", () => {
    it("Returns error result", async () => {
      dependencies.symmetricDecrypter = new MockSymmetricDecrypterFailure();
      const result = await new JweDecrypter("keyId", dependencies).decrypt(
        "protectedHeader.encryptedKey.iv.ciphertext.tag",
      );

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage:
          "Unable to decrypt payload - Error: Some mock symmetric decryption error",
        errorCategory: ErrorCategory.CLIENT_ERROR,
      });
    });
  });

  describe("Given decrypting JWE succeeds", () => {
    it("Returns success result", async () => {
      const result = await new JweDecrypter("keyId", dependencies).decrypt(
        "protectedHeader.encryptedKey.iv.ciphertext.tag",
      );

      expect(result.isError).toBe(false);
      expect(result.value).toStrictEqual("header.payload.signature");
    });
  });
});
