import { IJwks, IPublicKeyGetter, PublicKeyGetter } from "../publicKeyGetter";
import { MockJWTBuilder } from "../../../testUtils/mockJwtBuilder";

describe("Public Key Getter", () => {
  let mockJwks: IJwks;
  let publicKeyGetter: IPublicKeyGetter;
  let mockEncodedJwt: string;

  beforeEach(async () => {
    mockEncodedJwt = await new MockJWTBuilder().buildEncodedJwt();
    mockJwks = {
      keys: [
        {
          alg: "ES256",
          kid: "mockKid",
          kty: "EC",
          use: "sig",
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
      mockEncodedJwt = await new MockJWTBuilder()
        .deleteHeaderValue("kid")
        .buildEncodedJwt();
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
});
