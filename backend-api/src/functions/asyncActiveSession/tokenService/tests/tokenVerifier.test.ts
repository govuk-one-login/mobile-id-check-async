import { KeyLike } from "jose";
import { MockJWTBuilder } from "../../../testUtils/mockJwtBuilder";
import { ITokenVerifier, TokenVerifier } from "../tokenVerifier";

describe("Token Verifier", () => {
  let tokenVerifier: ITokenVerifier;
  let mockPublicKey: KeyLike | Uint8Array;
  let mockJwt: string;

  beforeEach(async () => {
    tokenVerifier = new TokenVerifier();
    mockJwt = new MockJWTBuilder().getEncodedJwt();
    mockPublicKey = await MockJWTBuilder.getPublicKey(MOCK_PUBLIC_KEY);
  });

  describe("Verify", () => {
    describe("Given there is an error verifying token signature", () => {
      it("Returns error result", async () => {
        const mockJwt = await new MockJWTBuilder().getEncodedJwt();
        const mockIncorrectPublicKey = await MockJWTBuilder.getPublicKey(
          MOCK_INCORRECT_PULIC_KEY,
        );

        const result = await tokenVerifier.verify(
          mockJwt,
          mockIncorrectPublicKey,
        );

        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Error verifying token signature",
          errorCategory: "CLIENT_ERROR",
        });
      });
    });

    describe("Given token signature verification is successful", () => {
      it("Returns success result", async () => {
        mockJwt = await new MockJWTBuilder()
          .setExp(1728994993626)
          .getSignedEncodedJwt(MOCK_PRIVATE_KEY);

        const result = await tokenVerifier.verify(mockJwt, mockPublicKey);

        expect(result.isError).toBe(false);
        expect(result.value).toStrictEqual({
          protectedHeader: {
            alg: "ES256",
            typ: "JWT",
          },
          payload: {
            aud: "mockIssuer",
            client_id: "mockClientId",
            exp: 1728994993626,
            iss: "mockIssuer",
            scope: "dcmaw.session.async_create",
          },
        });
      });
    });
  });
});

const MOCK_PUBLIC_KEY = {
  alg: "ES256",
  crv: "P-256",
  kid: "sThKMT3oxcTXG-sgMw2EVPTE9Y8W43wLXfqu7zT46-w",
  kty: "EC",
  use: "sig",
  x: "YMoiJArVzO9RIVR7J9mUlGixqWyXCAYrZLtdc8EhuO8",
  y: "47JYyUr0qlg3VksGlHCAdpwR_w1dixXfcTi7hBEfrRo",
};

const MOCK_INCORRECT_PULIC_KEY = {
  alg: "ES256",
  crv: "P-256",
  kid: "mockKid",
  kty: "EC",
  use: "sig",
  x: "NYmnFqCEFMVXQsmnSngTkiJK-Q9ixSBxLAXx6ZsBGlc",
  y: "9fpDnWl3rBP-T6z6e60Bmgym3ymjRK_VSdJ7wU_Nwvg",
};

const MOCK_PRIVATE_KEY = {
  crv: "P-256",
  d: "IMeUPld6UA1WUKJF34HDwZGT2tArxZslpl_dVYzOLKU",
  kid: "sThKMT3oxcTXG-sgMw2EVPTE9Y8W43wLXfqu7zT46-w",
  kty: "EC",
  x: "YMoiJArVzO9RIVR7J9mUlGixqWyXCAYrZLtdc8EhuO8",
  y: "47JYyUr0qlg3VksGlHCAdpwR_w1dixXfcTi7hBEfrRo",
};
