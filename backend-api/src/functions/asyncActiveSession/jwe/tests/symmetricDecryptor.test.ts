import { IDecryptSymmetric, SymmetricDecryptor } from "../symmetricDecryptor";
import { createCipheriv, randomBytes } from "node:crypto";

describe("Symmetric Decryptor", () => {
  let symmetricDecryptor: IDecryptSymmetric;

  beforeEach(() => {
    symmetricDecryptor = new SymmetricDecryptor();
  });

  const testSymmetricKey = randomBytes(32);
  const {
    encryptedData,
    initializationVector,
    additionalAuthenticatedData,
    authenticationTag,
  } = { ...getTestEncryptedData("someTestDataToEncrypt", testSymmetricKey) };

  describe("Given the encrypted data is successfully decrypted", () => {
    it("Returns the decrypted data", async () => {
      const result = await symmetricDecryptor.decrypt(
        testSymmetricKey,
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
