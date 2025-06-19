import { MockJWTBuilder } from "../../../testUtils/mockJwtBuilder";
import { TokenService } from "../tokenService";
import {
  emptySuccess,
  ErrorCategory,
  errorResult,
} from "../../../utils/result";

import { ITokenService, VerifyToken } from "../types";

describe("Token Service", () => {
  let tokenService: ITokenService;

  const mockVerifyTokenSuccess: VerifyToken = jest
    .fn()
    .mockResolvedValue(emptySuccess());

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date("2024-03-10"));
  });

  beforeEach(async () => {
    tokenService = new TokenService({
      verifyToken: mockVerifyTokenSuccess,
    });
  });

  describe("Header", () => {
    describe("Given the JWT header cannot be decoded", () => {
      it("Returns a client error result", async () => {
        const result = await tokenService.validateServiceToken(
          "test.invalid.jwt",
          "mockAudience",
          "mockIssuer",
        );

        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Failed to decode token header",
          errorCategory: ErrorCategory.CLIENT_ERROR,
        });
      });
    });

    describe("Given the kid claim is not present in JWT header", () => {
      it("Returns a client error result", async () => {
        const mockEncodedJwt = new MockJWTBuilder().deleteKid().getEncodedJwt();
        const result = await tokenService.validateServiceToken(
          mockEncodedJwt,
          "mockAudience",
          "mockIssuer",
        );

        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Invalid kid claim",
          errorCategory: ErrorCategory.CLIENT_ERROR,
        });
      });
    });
  });

  describe("Payload", () => {
    describe("Given the JWT payload cannot be decoded", () => {
      it("Returns a client error result", async () => {
        const result = await tokenService.validateServiceToken(
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Im1vY2tLaWQifQ.invalidPayload.LUQDp6G6w_6mREfiiUOVukZ-DtZFeZzhhw0vwpoKnDM",
          "mockAudience",
          "mockIssuer",
        );

        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Failed to decode token payload",
          errorCategory: ErrorCategory.CLIENT_ERROR,
        });
      });
    });

    describe("Given the not-before claim value is in the future", () => {
      it("Returns a client error result", async () => {
        const mockEncodedJwt = new MockJWTBuilder()
          .setNbf(1729074171)
          .getEncodedJwt();
        const result = await tokenService.validateServiceToken(
          mockEncodedJwt,
          "mockAudience",
          "mockIssuer",
        );

        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Invalid not-before claim",
          errorCategory: ErrorCategory.CLIENT_ERROR,
        });
      });
    });

    describe("Given the issuer claim is not present in the JWT payload", () => {
      it("Returns a client error result", async () => {
        const mockEncodedJwt = new MockJWTBuilder().deleteIss().getEncodedJwt();
        const result = await tokenService.validateServiceToken(
          mockEncodedJwt,
          "mockAudience",
          "mockIssuer",
        );

        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Invalid issuer claim",
          errorCategory: ErrorCategory.CLIENT_ERROR,
        });
      });
    });

    describe("Given the issuer claim value is not the expected value", () => {
      it("Returns a client error result", async () => {
        const mockEncodedJwt = new MockJWTBuilder()
          .setIss("invalidIssuer")
          .getEncodedJwt();
        const result = await tokenService.validateServiceToken(
          mockEncodedJwt,
          "mockAudience",
          "mockIssuer",
        );

        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Invalid issuer claim",
          errorCategory: ErrorCategory.CLIENT_ERROR,
        });
      });
    });

    describe("Given the audience claim is not present in the JWT payload", () => {
      it("Returns a client error result", async () => {
        const mockEncodedJwt = new MockJWTBuilder().deleteAud().getEncodedJwt();
        const result = await tokenService.validateServiceToken(
          mockEncodedJwt,
          "mockAudience",
          "mockIssuer",
        );

        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Invalid audience claim",
          errorCategory: ErrorCategory.CLIENT_ERROR,
        });
      });
    });

    describe("Given the audience claim value is not the expected value", () => {
      it("Returns a client error result", async () => {
        const mockEncodedJwt = new MockJWTBuilder()
          .setAud("invalidAudience")
          .getEncodedJwt();
        const result = await tokenService.validateServiceToken(
          mockEncodedJwt,
          "mockAudience",
          "mockIssuer",
        );

        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Invalid audience claim",
          errorCategory: ErrorCategory.CLIENT_ERROR,
        });
      });
    });

    describe("Given the scope claim is not present in the JWT payload", () => {
      it("Returns a client error result", async () => {
        const mockEncodedJwt = new MockJWTBuilder()
          .deleteScope()
          .getEncodedJwt();
        const result = await tokenService.validateServiceToken(
          mockEncodedJwt,
          "mockAudience",
          "mockIssuer",
        );

        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Invalid scope claim",
          errorCategory: ErrorCategory.CLIENT_ERROR,
        });
      });
    });

    describe("Given the scope claim value is not the expected value", () => {
      it("Returns a client error result", async () => {
        const mockEncodedJwt = new MockJWTBuilder()
          .setScope("invalidScope")
          .getEncodedJwt();
        const result = await tokenService.validateServiceToken(
          mockEncodedJwt,
          "mockAudience",
          "mockIssuer",
        );

        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Invalid scope claim",
          errorCategory: ErrorCategory.CLIENT_ERROR,
        });
      });
    });

    describe("Given the sub claim is not present in the JWT payload", () => {
      it("Returns a client error result", async () => {
        const mockEncodedJwt = new MockJWTBuilder()
          .setScope("idCheck.activeSession.read")
          .getEncodedJwt();
        const result = await tokenService.validateServiceToken(
          mockEncodedJwt,
          "mockAudience",
          "mockIssuer",
        );

        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Invalid sub claim",
          errorCategory: ErrorCategory.CLIENT_ERROR,
        });
      });
    });

    describe("Given the expiry claim is not present in the JWT payload", () => {
      it("Returns a client error result", async () => {
        const mockEncodedJwt = new MockJWTBuilder()
          .setScope("idCheck.activeSession.read")
          .setSub("mockSub")
          .deleteExp()
          .getEncodedJwt();
        const result = await tokenService.validateServiceToken(
          mockEncodedJwt,
          "mockAudience",
          "mockIssuer",
        );

        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Token expiry time is missing or is in the past",
          errorCategory: ErrorCategory.CLIENT_ERROR,
        });
      });
    });

    describe("Given the expiry claim value is in the past", () => {
      it("Returns a client error result", async () => {
        const mockEncodedJwt = new MockJWTBuilder()
          .setScope("idCheck.activeSession.read")
          .setSub("mockSub")
          .setExp(1706783129)
          .getEncodedJwt();
        const result = await tokenService.validateServiceToken(
          mockEncodedJwt,
          "mockAudience",
          "mockIssuer",
        );

        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Token expiry time is missing or is in the past",
          errorCategory: ErrorCategory.CLIENT_ERROR,
        });
      });
    });

    describe("Given the issued at time claim is not present in the JWT payload", () => {
      it("Returns a client error result", async () => {
        const mockEncodedJwt = new MockJWTBuilder()
          .setScope("idCheck.activeSession.read")
          .setSub("mockSub")
          .getEncodedJwt();
        const result = await tokenService.validateServiceToken(
          mockEncodedJwt,
          "mockAudience",
          "mockIssuer",
        );

        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Token issued at time is missing or is in the future",
          errorCategory: ErrorCategory.CLIENT_ERROR,
        });
      });
    });

    describe("Given the issued at time claim value is in the future", () => {
      it("Returns a client error result", async () => {
        const mockEncodedJwt = new MockJWTBuilder()
          .setScope("idCheck.activeSession.read")
          .setSub("mockSub")
          .setIat(1728555929)
          .getEncodedJwt();
        const result = await tokenService.validateServiceToken(
          mockEncodedJwt,
          "mockAudience",
          "mockIssuer",
        );

        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Token issued at time is missing or is in the future",
          errorCategory: ErrorCategory.CLIENT_ERROR,
        });
      });
    });
  });

  describe("Signature", () => {
    describe("Given the token signature could not be verified", () => {
      it("Returns a client error result", async () => {
        const mockEncodedJwt = new MockJWTBuilder()
          .setScope("idCheck.activeSession.read")
          .setSub("mockSub")
          .setIat(1710028700)
          .getEncodedJwt();

        tokenService = new TokenService({
          verifyToken: jest.fn().mockResolvedValue(
            errorResult({
              errorMessage: "mockErrorMessage",
              errorCategory: ErrorCategory.CLIENT_ERROR,
            }),
          ),
        });
        const result = await tokenService.validateServiceToken(
          mockEncodedJwt,
          "mockAudience",
          "mockIssuer",
        );

        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "mockErrorMessage",
          errorCategory: ErrorCategory.CLIENT_ERROR,
        });
      });
    });

    describe("Given the token signature is verified", () => {
      it("Returns the sub claim", async () => {
        const mockEncodedJwt = new MockJWTBuilder()
          .setScope("idCheck.activeSession.read")
          .setSub("mockSub")
          .setIat(1710028700)
          .getEncodedJwt();
        const result = await tokenService.validateServiceToken(
          mockEncodedJwt,
          "mockAudience",
          "mockIssuer",
        );

        expect(result.isError).toBe(false);
        expect(result.value).toStrictEqual("mockSub");
      });
    });
  });
});
