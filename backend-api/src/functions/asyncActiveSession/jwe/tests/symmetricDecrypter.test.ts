import { IDecryptSymmetric, SymmetricDecrypter } from "../symmetricDecrypter";
import { createCipheriv, randomBytes } from "node:crypto";

describe("Symmetric Decrypter", () => {
  let symmetricDecrypter: IDecryptSymmetric;

  beforeEach(() => {
    symmetricDecrypter = new SymmetricDecrypter();
  });

  const symmetricEncryptionKey = randomBytes(32);
  const {
    encryptedData,
    initializationVector,
    additionalAuthenticatedData,
    authenticationTag,
  } = {
    ...getTestEncryptedData("someTestDataToEncrypt", symmetricEncryptionKey),
  };

  describe("Given an error happens trying to decrypt the data (i.e. the encryption key is invalid)", () => {
    it("Throws the error", () => {
      const invalidSymmetricKey = new Buffer(10);

      expect(() =>
        symmetricDecrypter.decrypt(
          invalidSymmetricKey,
          initializationVector,
          encryptedData,
          authenticationTag,
          additionalAuthenticatedData,
        ),
      ).toThrowError(RangeError("Invalid key length"));
    });
  });

  describe("Given the encrypted data is successfully decrypted", () => {
    it("Returns the decrypted data", () => {
      const result = symmetricDecrypter.decrypt(
        symmetricEncryptionKey,
        initializationVector,
        encryptedData,
        authenticationTag,
        additionalAuthenticatedData,
      );

      expect(result).toStrictEqual("someTestDataToEncrypt");
    });
  });
});

export function getTestEncryptedData(
  data: string,
  key: Uint8Array,
): {
  encryptedData: Uint8Array;
  additionalAuthenticatedData: Buffer;
  initializationVector: Uint8Array;
  authenticationTag: Uint8Array;
} {
  const initializationVector = randomBytes(16);
  const alg = "aes-256-gcm";
  const additionalAuthenticatedData = Buffer.from(
    JSON.stringify({
      key: "value",
    }),
  );
  const cipher = createCipheriv(alg, key, initializationVector);
  cipher.setAAD(additionalAuthenticatedData);
  const encryptedData = Buffer.concat([cipher.update(data), cipher.final()]);
  return {
    encryptedData,
    initializationVector,
    additionalAuthenticatedData,
    authenticationTag: cipher.getAuthTag(),
  };
}
