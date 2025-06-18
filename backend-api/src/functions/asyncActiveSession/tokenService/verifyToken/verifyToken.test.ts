import { MockJWTBuilder } from "../../../testUtils/mockJwtBuilder";
import {
  emptyFailure,
  emptySuccess,
  ErrorCategory,
  errorResult,
  Result,
  successResult,
} from "../../../utils/result";
import { IGetKeys } from "../../../common/jwks/types";
import { verifyToken } from "./verifyToken";
import { mockKeyId } from "../../../testUtils/unitTestData";
import { VerifyTokenDependencies } from "../types";

describe("verifyToken", () => {
  let result: Result<void>;
  let dependencies: VerifyTokenDependencies;
  let mockJwt: string;

  const mockMatchingJwk = {
    alg: "ES256",
    crv: "P-256",
    kid: mockKeyId,
    kty: "EC",
    use: "sig",
    x: "YMoiJArVzO9RIVR7J9mUlGixqWyXCAYrZLtdc8EhuO8",
    y: "47JYyUr0qlg3VksGlHCAdpwR_w1dixXfcTi7hBEfrRo",
  };
  const mockStsBaseUrl = "mockStsBaseUrl";
  const mockSuccessfulGetKeys: IGetKeys = jest.fn().mockResolvedValue(
    successResult({
      keys: [mockMatchingJwk],
    }),
  );

  beforeEach(async () => {
    mockJwt = await new MockJWTBuilder()
      .setExp(1728994993626)
      .getSignedEncodedJwt();
    dependencies = {
      getKeys: mockSuccessfulGetKeys,
    };
  });

  describe("Given the public keys cannot be retrieved", () => {
    beforeEach(async () => {
      dependencies.getKeys = jest.fn().mockResolvedValue(emptyFailure());
      result = await verifyToken(
        mockJwt,
        mockKeyId,
        mockStsBaseUrl,
        dependencies,
      );
    });

    it("Returns error result with server error", async () => {
      expect(result).toEqual(
        errorResult({
          errorMessage: "Error retrieving JWKS",
          errorCategory: ErrorCategory.SERVER_ERROR,
        }),
      );
    });
  });

  describe("Given no key is found matching provided key ID", () => {
    beforeEach(async () => {
      dependencies.getKeys = jest.fn().mockResolvedValue(
        successResult({
          keys: [
            {
              ...mockMatchingJwk,
              kid: "doesNotMatch",
            },
          ],
        }),
      );
      result = await verifyToken(
        mockJwt,
        mockKeyId,
        mockStsBaseUrl,
        dependencies,
      );
    });

    it("Returns error result with server error", async () => {
      expect(result).toEqual(
        errorResult({
          errorMessage: "No JWK found matching provided key ID",
          errorCategory: ErrorCategory.SERVER_ERROR,
        }),
      );
    });
  });

  describe("Given matching JWK cannot be parsed as a public key", () => {
    beforeEach(async () => {
      dependencies.getKeys = jest.fn().mockResolvedValue(
        successResult({
          keys: [
            {
              ...mockMatchingJwk,
              kty: "invalid",
            },
          ],
        }),
      );
      result = await verifyToken(
        mockJwt,
        mockKeyId,
        mockStsBaseUrl,
        dependencies,
      );
    });

    it("Returns error result with server error", async () => {
      expect(result).toEqual(
        errorResult({
          errorMessage:
            'Invalid JWK - JOSENotSupported: Unsupported "kty" (Key Type) Parameter value',
          errorCategory: ErrorCategory.SERVER_ERROR,
        }),
      );
    });
  });

  describe("Given the token signature cannot be verified", () => {
    beforeEach(async () => {
      const mockJwtWithInvalidSignature = mockJwt + "X";
      result = await verifyToken(
        mockJwtWithInvalidSignature,
        mockKeyId,
        mockStsBaseUrl,
        dependencies,
      );
    });

    it("Returns error result with server error", async () => {
      expect(result).toEqual(
        errorResult({
          errorMessage: "Error verifying token signature",
          errorCategory: ErrorCategory.CLIENT_ERROR,
        }),
      );
    });
  });

  describe("Given token signature verification is successful", () => {
    beforeEach(async () => {
      result = await verifyToken(
        mockJwt,
        mockKeyId,
        mockStsBaseUrl,
        dependencies,
      );
    });

    it("Passes correct arguments to get keys", () => {
      const expectedJwksUri = mockStsBaseUrl + "/.well-known/jwks.json";
      expect(mockSuccessfulGetKeys).toHaveBeenCalledWith(
        expectedJwksUri,
        mockKeyId,
      );
    });

    it("Returns empty success", async () => {
      expect(result).toEqual(emptySuccess());
    });
  });
});
