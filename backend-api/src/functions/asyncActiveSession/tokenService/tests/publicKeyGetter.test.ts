import { IJwks, IPublicKeyGetter, PublicKeyGetter } from "../publicKeyGetter";
import { MockJWTBuilder } from "../../../testUtils/mockJwt";

describe("Public Key Getter", () => {
  let mockJwks: IJwks;
  let publicKeyGetter: IPublicKeyGetter;
  let mockEncodedJwt: string;

  beforeEach(async () => {
    mockEncodedJwt = new MockJWTBuilder()
      .setKid("mockKid")
      .getEncodedJwt();
    mockJwks = {
      keys: [
        {
          alg: "ES256",
          kid: "mockKid",
          kty: "EC",
          use: "sig",
          crv: "P-256",
          x: "NYmnFqCEFMVXQsmnSngTkiJK-Q9ixSBxLAXx6ZsBGlc",
          y: "9fpDnWl3rBP-T6z6e60Bmgym3ymjRK_VSdJ7wU_Nwvg",
        },
        {
          alg: "ES256",
          kid: "mockKid2",
          kty: "EC",
          use: "sig",
          crv: "P-256",
          x: "NYmnFqCEFMVXQsmnSngTkiJK-Q9ixSBxLAXx6ZsBGlc",
          y: "9fpDnWl3rBP-T6z6e60Bmgym3ymjRK_VSdJ7wU_Nwvg",
        },
      ],
    };
    publicKeyGetter = new PublicKeyGetter();
  });

  describe("Given decoding the protected header fails", () => {
    it("Return error result", async () => {
      const result = await publicKeyGetter.getPublicKey(
        "mockInvalidJWT",
        mockJwks,
      );

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage:
          "Failed verifying service token signature. TypeError: Invalid Token or Protected Header formatting",
        errorCategory: "CLIENT_ERROR",
      });
    });
  });

  describe("Given kid is not present in JWT header", () => {
    it("Return error result", async () => {
      mockEncodedJwt = new MockJWTBuilder()
        .deleteKid()
        .getEncodedJwt();
      const result = await publicKeyGetter.getPublicKey(
        mockEncodedJwt,
        mockJwks,
      );

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage:
          "Failed verifying service token signature: kid not present in JWT header",
        errorCategory: "CLIENT_ERROR",
      });
    });
  });

  describe("Given kid is not found in JWKS", () => {
    it("Return error result", async () => {
      mockEncodedJwt = new MockJWTBuilder()
        .setKid("mockInvalidKid")
        .getEncodedJwt();
      const result = await publicKeyGetter.getPublicKey(
        mockEncodedJwt,
        mockJwks,
      );

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage: "Failed verifying service token signature: JWK not found",
        errorCategory: "CLIENT_ERROR",
      });
    });
  });

  describe("Given converting JWK to a key object fails", () => {
    it("Return error result", async () => {
      delete mockJwks.keys[0].crv;
      const result = await publicKeyGetter.getPublicKey(
        mockEncodedJwt,
        mockJwks,
      );

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage:
          'Failed verifying service token signature: Error converting JWK to key object: TypeError [ERR_INVALID_ARG_TYPE]: The "key.crv" property must be of type string. Received undefined',
        errorCategory: "CLIENT_ERROR",
      });
    });
  });
});
