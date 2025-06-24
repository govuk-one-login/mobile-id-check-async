import { MockJWTBuilder } from "../../../testUtils/mockJwtBuilder";
import { TokenService } from "../TokenService";
import {
  emptyFailure,
  ErrorCategory,
  errorResult,
  Result,
  successResult,
} from "../../../utils/result";

import { ITokenService, TokenServiceDependencies } from "../types";
import { IGetKeys } from "../../../common/jwks/JwksCache/types";
import {
  activeSessionReadScope,
  mockKeyId,
} from "../../../testUtils/unitTestData";

describe("Token Service", () => {
  let tokenService: ITokenService;
  let dependencies: TokenServiceDependencies;
  let result: Result<string>;
  let mockValidEncodedJwt: string;

  const mockIssuer = "mockIssuer";
  const mockAudience = "mockAudience";

  const mockMatchingJwk = {
    alg: "ES256",
    crv: "P-256",
    kid: mockKeyId,
    kty: "EC",
    use: "sig",
    x: "YMoiJArVzO9RIVR7J9mUlGixqWyXCAYrZLtdc8EhuO8",
    y: "47JYyUr0qlg3VksGlHCAdpwR_w1dixXfcTi7hBEfrRo",
  };
  const mockSuccessfulGetKeys: IGetKeys = jest.fn().mockResolvedValue(
    successResult({
      keys: [mockMatchingJwk],
    }),
  );

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date("2024-03-10"));
  });

  beforeEach(async () => {
    mockValidEncodedJwt = await new MockJWTBuilder()
      .setScope(activeSessionReadScope)
      .setSub("mockSub")
      .setIat(1710028700)
      .getSignedEncodedJwt();
    dependencies = {
      getKeys: mockSuccessfulGetKeys,
    };
    tokenService = new TokenService(dependencies);
  });

  describe("JWT header and payload validation", () => {
    describe.each([
      {
        scenario: "Given the JWT header cannot be decoded",
        jwt: "test.invalid.jwt",
        expectedErrorMessage:
          "Failed to decode token header: TypeError: Invalid Token or Protected Header formatting",
      },
      {
        scenario: "Given the kid claim is not present in JWT header",
        jwt: new MockJWTBuilder().deleteKid().getEncodedJwt(),
        expectedErrorMessage: "Invalid kid claim",
      },
      {
        scenario: "Given the JWT payload cannot be decoded",
        jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Im1vY2tLaWQifQ.invalidPayload.LUQDp6G6w_6mREfiiUOVukZ-DtZFeZzhhw0vwpoKnDM",
        expectedErrorMessage: "Failed to decode token payload",
      },
      {
        scenario: "Given the not-before claim value is in the future",
        jwt: new MockJWTBuilder().setNbf(1729074171).getEncodedJwt(),
        expectedErrorMessage: "Invalid not-before claim",
      },
      {
        scenario: "Given the issuer claim is not present in the JWT payload",
        jwt: new MockJWTBuilder().deleteIss().getEncodedJwt(),
        expectedErrorMessage: "Invalid issuer claim",
      },
      {
        scenario: "Given the issuer claim value is not the expected value",
        jwt: new MockJWTBuilder().setIss("invalidIssuer").getEncodedJwt(),
        expectedErrorMessage: "Invalid issuer claim",
      },
      {
        scenario: "Given the audience claim is not present in the JWT payload",
        jwt: new MockJWTBuilder().deleteAud().getEncodedJwt(),
        expectedErrorMessage: "Invalid audience claim",
      },
      {
        scenario: "Given the audience claim value is not the expected value",
        jwt: new MockJWTBuilder().setAud("invalidAudience").getEncodedJwt(),
        expectedErrorMessage: "Invalid audience claim",
      },
      {
        scenario: "Given the scope claim is not present in the JWT payload",
        jwt: new MockJWTBuilder().deleteScope().getEncodedJwt(),
        expectedErrorMessage: "Invalid scope claim",
      },
      {
        scenario: "Given the scope claim value is not the expected value",
        jwt: new MockJWTBuilder().setScope("invalidScope").getEncodedJwt(),
        expectedErrorMessage: "Invalid scope claim",
      },
      {
        scenario: "Given the sub claim is not present in the JWT payload",
        jwt: new MockJWTBuilder()
          .setScope(activeSessionReadScope)
          .getEncodedJwt(),
        expectedErrorMessage: "Invalid sub claim",
      },
      {
        scenario: "Given the expiry claim is not present in the JWT payload",
        jwt: new MockJWTBuilder()
          .setScope(activeSessionReadScope)
          .setSub("mockSub")
          .deleteExp()
          .getEncodedJwt(),
        expectedErrorMessage: "Token expiry time is missing or is in the past",
      },
      {
        scenario: "Given the expiry claim value is in the past",
        jwt: new MockJWTBuilder()
          .setScope(activeSessionReadScope)
          .setSub("mockSub")
          .setExp(1706783129)
          .getEncodedJwt(),
        expectedErrorMessage: "Token expiry time is missing or is in the past",
      },
      {
        scenario:
          "Given the issued at time claim is not present in the JWT payload",
        jwt: new MockJWTBuilder()
          .setScope(activeSessionReadScope)
          .setSub("mockSub")
          .getEncodedJwt(),
        expectedErrorMessage:
          "Token issued at time is missing or is in the future",
      },
      {
        scenario: "Given the issued at time claim value is in the future",
        jwt: new MockJWTBuilder()
          .setScope(activeSessionReadScope)
          .setSub("mockSub")
          .setIat(1728555929)
          .getEncodedJwt(),
        expectedErrorMessage:
          "Token issued at time is missing or is in the future",
      },
    ])("$scenario", ({ jwt, expectedErrorMessage }) => {
      beforeEach(async () => {
        result = await tokenService.validateServiceToken(
          jwt,
          mockAudience,
          mockIssuer,
        );
      });

      it("Returns a client error result", () => {
        expect(result).toEqual(
          errorResult({
            errorMessage: expectedErrorMessage,
            errorCategory: ErrorCategory.CLIENT_ERROR,
          }),
        );
      });
    });
  });

  describe("Given public keys cannot be retrieved", () => {
    beforeEach(async () => {
      dependencies.getKeys = jest.fn().mockResolvedValue(emptyFailure());
      result = await tokenService.validateServiceToken(
        mockValidEncodedJwt,
        mockAudience,
        mockIssuer,
      );
    });

    it("Returns error result with server error", () => {
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
      result = await tokenService.validateServiceToken(
        mockValidEncodedJwt,
        mockAudience,
        mockIssuer,
      );
    });

    it("Returns error result with server error", () => {
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
      result = await tokenService.validateServiceToken(
        mockValidEncodedJwt,
        mockAudience,
        mockIssuer,
      );
    });

    it("Returns error result with server error", () => {
      expect(result).toEqual(
        errorResult({
          errorMessage:
            'Invalid JWK - JOSENotSupported: Unsupported "kty" (Key Type) Parameter value',
          errorCategory: ErrorCategory.SERVER_ERROR,
        }),
      );
    });
  });

  describe("Given the token signature cannot be verified using matching JWK", () => {
    beforeEach(async () => {
      const mockInvalidSignatureJwt = mockValidEncodedJwt + "arbitrarySuffix";
      result = await tokenService.validateServiceToken(
        mockInvalidSignatureJwt,
        mockAudience,
        mockIssuer,
      );
    });

    it("Returns a client error result", () => {
      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage:
          "Error verifying token signature - JWSSignatureVerificationFailed: signature verification failed",
        errorCategory: ErrorCategory.CLIENT_ERROR,
      });
    });
  });

  describe("Given token signature verification is successful", () => {
    beforeEach(async () => {
      result = await tokenService.validateServiceToken(
        mockValidEncodedJwt,
        mockAudience,
        mockIssuer,
      );
    });

    it("Passes correct arguments to get keys", () => {
      const expectedJwksUri = mockIssuer + "/.well-known/jwks.json";
      expect(mockSuccessfulGetKeys).toHaveBeenCalledWith(
        expectedJwksUri,
        mockKeyId,
      );
    });

    it("Returns the sub claim", () => {
      expect(result.isError).toBe(false);
      expect(result.value).toStrictEqual("mockSub");
    });
  });
});
