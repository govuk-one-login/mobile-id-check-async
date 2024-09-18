import { TokenSigner } from "../tokenSigner";
import { decodeJwt, decodeProtectedHeader, importJWK } from "jose";

describe("TokenSigner", () => {
  const payload = {
    aud: "TBC",
    iss: "MockStsBaseUrl",
    sub: "testSub",
    iat: 1726658577,
    exp: 1726658757,
    scope: "test.scope.blah",
  };

  let tokenSigner: TokenSigner;

  beforeEach(() => {
    tokenSigner = new TokenSigner();
  });

  describe("Given an error happens when trying to sign the token", () => {
    it("Returns an error response", async () => {
      const invalidSigningKey = new Uint8Array();
      const result = await tokenSigner.sign(payload, invalidSigningKey);

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage: "Error signing token",
        errorCategory: "SERVER_ERROR",
      });
    });
  });

  describe("Given the service token is successfully generated", () => {
    it("Returns a success response which includes the token", async () => {
      const signingKey = await importJWK({
        kty: "EC",
        x: "Fu8jCR5SKk4U7GgEpwhWcAskSaNijIWatBDTlq9wtLE",
        y: "JWPbl4IH21CzX-xIT56BcohswoudKGprHNyoA3Q7MnY",
        crv: "P-256",
        d: "hrOBzfJwnr-XSY-I4j-aCgNjcDq7_TfOd2W9u7al56Y",
      });
      const result = await tokenSigner.sign(payload, signingKey);

      expect(result.isError).toBe(false);
      expect(result.value).toBeDefined();

      const tokenHeader = decodeProtectedHeader(result.value as string);
      const tokenClaims = decodeJwt(result.value as string);

      expect(tokenHeader).toHaveProperty("alg", "ES256");
      expect(tokenHeader).toHaveProperty("typ", "JWT");
      expect(tokenClaims).toHaveProperty("aud", "TBC");
      expect(tokenClaims).toHaveProperty("sub", "testSub");
      expect(tokenClaims).toHaveProperty("scope", "test.scope.blah");
      expect(tokenClaims).toHaveProperty("iss", "MockStsBaseUrl");
      expect(tokenClaims).toHaveProperty("iat", 1726658577);
      expect(tokenClaims).toHaveProperty("exp", 1726658757);
    });
  });
});
