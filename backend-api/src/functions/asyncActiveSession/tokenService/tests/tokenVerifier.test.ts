import { MockJWTBuilder } from "../../../testUtils/mockJwtBuilder";
import { ITokenVerifier, TokenVerifier } from "../tokenVerifier";
import {
  MockPubicKeyGetterError,
  MockPubicKeyGetterSuccess,
  MockPubicKeyGetterWrongPublicKey,
} from "./mocks";

describe("Token Verifier", () => {
  let tokenVerifier: ITokenVerifier;
  let mockJwt: string;

  beforeEach(async () => {
    tokenVerifier = new TokenVerifier({
      publicKeyGetter: new MockPubicKeyGetterSuccess(),
    });
    mockJwt = new MockJWTBuilder().getEncodedJwt();
  });

  describe("Verify", () => {
    describe("Given the public keys cannot be retrieved", () => {
      it("Returns error result", async () => {
        tokenVerifier = new TokenVerifier({
          publicKeyGetter: new MockPubicKeyGetterError(),
        });
        const mockJwt = new MockJWTBuilder().getEncodedJwt();

        const result = await tokenVerifier.verify(
          mockJwt,
          "mockKid",
          "https://test.com/.well-known/jwks.json",
        );

        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Failed to get public key",
          errorCategory: "SERVER_ERROR",
        });
      });
    });

    describe("Given the token signature could not be verified", () => {
      it("Returns error result", async () => {
        tokenVerifier = new TokenVerifier({
          publicKeyGetter: new MockPubicKeyGetterWrongPublicKey(),
        });
        const mockJwt = new MockJWTBuilder().getEncodedJwt();

        const result = await tokenVerifier.verify(
          mockJwt,
          "mockKid",
          "https://test.com/.well-known/jwks.json",
        );

        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Error verifying token signature",
          errorCategory: "CLIENT_ERROR",
        });
      });
    });

    describe("Given token signature verification is successful", () => {
      it("Returns an empty success result", async () => {
        mockJwt = await new MockJWTBuilder()
          .setExp(1728994993626)
          .getSignedEncodedJwt();

        const result = await tokenVerifier.verify(
          mockJwt,
          "mockKid",
          "https://test.com/.well-known/jwks.json",
        );

        expect(result.isError).toBe(false);
        expect(result.value).toStrictEqual(null);
      });
    });
  });
});
