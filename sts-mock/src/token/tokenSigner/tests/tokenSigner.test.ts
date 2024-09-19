import { TokenSigner } from "../tokenSigner";
import { decodeJwt, decodeProtectedHeader } from "jose";
import { generateKeyPairSync } from "node:crypto";
import { getMockSigningKey } from "../../../testUtils/getMockSigningKey";

describe("Token Signer", () => {
  const payload = {
    aud: "TBC",
    iss: "MockStsBaseUrl",
    sub: "testSub",
    iat: 1726658577,
    exp: 1726658757,
    scope: "test.scope.blah",
  };
  const { signingKey, keyId } = getMockSigningKey();
  let tokenSigner: TokenSigner;

  beforeEach(() => {
    tokenSigner = new TokenSigner();
  });

  describe("Given an error happens when trying to sign the token payload", () => {
    it("Returns an error response", async () => {
      const invalidPrivateKeyRsa = generateKeyPairSync("rsa", {
        modulusLength: 2048,
      }).privateKey;
      // Attempting to sign with an RSA key instead of EC key raises an exception
      const result = await tokenSigner.sign(
        keyId,
        payload,
        invalidPrivateKeyRsa,
      );

      expect(result.isError).toStrictEqual(true);
      expect(result.value).toStrictEqual({
        errorMessage: "Error signing token",
        errorCategory: "SERVER_ERROR",
      });
    });
  });

  describe("Given the token payload is successfully signed", () => {
    it("Returns a success response", async () => {
      const result = await tokenSigner.sign(keyId, payload, signingKey);
      const tokenHeader = decodeProtectedHeader(result.value as string);
      const tokenClaims = decodeJwt(result.value as string);

      expect(result.isError).toStrictEqual(false);
      expect(tokenHeader).toHaveProperty("alg", "ES256");
      expect(tokenHeader).toHaveProperty("typ", "JWT");
      expect(tokenHeader).toHaveProperty(
        "kid",
        "iyVpkshZ0QKq5ORWz7mc76x0dAKUp4RS113tiHACjpQ",
      );
      expect(tokenClaims).toHaveProperty("aud", "TBC");
      expect(tokenClaims).toHaveProperty("sub", "testSub");
      expect(tokenClaims).toHaveProperty("scope", "test.scope.blah");
      expect(tokenClaims).toHaveProperty("iss", "MockStsBaseUrl");
      expect(tokenClaims).toHaveProperty("iat", 1726658577);
      expect(tokenClaims).toHaveProperty("exp", 1726658757);
    });
  });
});
