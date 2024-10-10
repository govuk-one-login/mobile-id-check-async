import { JweDecryptor, JweDecryptorDependencies } from "../jweDecryptor";
import {
  MockSymmetricDecrypterFailure,
  MockSymmetricDecrypterSuccess,
} from "./mocks";
import {
  MockAsymmetricDecrypterFailure,
  MockAsymmetricDecrypterSuccess,
} from "../../../adapters/tests/mocks";

describe("Decrypt JWE", () => {
  let dependencies: JweDecryptorDependencies;

  beforeEach(() => {
    dependencies = {
      symmetricDecryptor: new MockSymmetricDecrypterSuccess(),
      asymmetricDecryptor: new MockAsymmetricDecrypterSuccess(),
    };
  });

  describe("Given the JWE does not consist of five components", () => {
    it("Returns an error result", async () => {
      const result = await new JweDecryptor("keyId", dependencies).decrypt(
        "protectedHeader.encryptedKey.iv.ciphertext",
      );

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage: "Error decrypting JWE: Missing component",
        errorCategory: "CLIENT_ERROR",
      });
    });
  });

  describe("Given an error happens trying to decrypt the CEK", () => {
    it("Returns a SERVER_ERROR error result", async () => {
      dependencies.asymmetricDecryptor = new MockAsymmetricDecrypterFailure();
      const result = await new JweDecryptor("keyId", dependencies).decrypt(
        "protectedHeader.encryptedKey.iv.ciphertext.tag",
      );

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage:
          "Error decrypting JWE: Unable to decrypt encryption key: Some mock asymmetric decryption error",
        errorCategory: "CLIENT_ERROR",
      });
    });
  });

  describe("Given decrypting JWE fails", () => {
    it("Returns error result", async () => {
      dependencies.symmetricDecryptor = new MockSymmetricDecrypterFailure();
      const result = await new JweDecryptor("keyId", dependencies).decrypt(
        "protectedHeader.encryptedKey.iv.ciphertext.tag",
      );

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage:
          "Error decrypting JWE: Unable to decrypt payload: Some mock symmetric decryption error",
        errorCategory: "CLIENT_ERROR",
      });
    });
  });

  describe("Given decrypting JWE succeeds", () => {
    it("Returns success result", async () => {
      const result = await new JweDecryptor("keyId", dependencies).decrypt(
        "protectedHeader.encryptedKey.iv.ciphertext.tag",
      );

      expect(result.isError).toBe(false);
      expect(result.value).toStrictEqual("header.payload.signature");
    });
  });
});
