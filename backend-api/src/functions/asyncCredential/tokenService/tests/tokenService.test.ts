import { KMSClient, VerifyCommand } from "@aws-sdk/client-kms";
import { mockClient } from "aws-sdk-client-mock";
import { TokenService } from "../tokenService";
import { MockJWTBuilder } from "../../../testUtils/mockJwt";

describe("Token Service", () => {
  describe("Verify token claims", () => {
    describe("Given payload does not contain valid JSON", () => {
      it("Returns error response", () => {
        const tokenService = new TokenService();
        const invalidJson =
          "eyJhbGciOiJIUzI1NiIsInR5cGUiOiJKV1QifQ.eyJpc3MiOiJtb2NrSXNzdWVyIiwiYXVkIjoibW9ja0lzc3VlciIsInNjb3BlIjoiZGNtYXcuc2Vzc2lvbi5hc3luY19jcmVhdGUiCJjbGllbnRfaWQiOiJtb2NrQ2xpZW50SWQifQ.fFnJIXCCkFY-LdzcUB7JmedN-97sE2J-J1FT74HJd7o";
        const authorizationHeader = `Bearer ${invalidJson}`;

        const result = tokenService.getDecodedToken({
          authorizationHeader,
          issuer: "mockIssuer",
        });

        expect(result.isError).toEqual(true);
        expect(result.value).toStrictEqual({
          errorMessage: "JWT payload not valid JSON",
          errorCategory: "CLIENT_ERROR",
        });
      });
    });
    describe("Given exp claim is invalid", () => {
      describe("Given expiry date is missing", () => {
        it("Returns error response", () => {
          const tokenService = new TokenService();
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.deleteExp();
          const authorizationHeader = `Bearer ${jwtBuilder.getEncodedJwt()}`;

          const result = tokenService.getDecodedToken({
            authorizationHeader,
            issuer: "mockIssuer",
          });

          expect(result.isError).toEqual(true);
          expect(result.value).toStrictEqual({
            errorMessage: "Missing exp claim",
            errorCategory: "CLIENT_ERROR",
          });
        });
      });

      describe("Given expiry date is in the past", () => {
        it("Returns error response", () => {
          const tokenService = new TokenService();
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.setExp(Math.floor(Date.now() - 1000) / 1000);
          const authorizationHeader = `Bearer ${jwtBuilder.getEncodedJwt()}`;

          const result = tokenService.getDecodedToken({
            authorizationHeader,
            issuer: "mockIssuer",
          });

          expect(result.isError).toEqual(true);
          expect(result.value).toStrictEqual({
            errorMessage: "exp claim is in the past",
            errorCategory: "CLIENT_ERROR",
          });
        });
      });
    });

    describe("Given iat claim is invalid", () => {
      describe("Given issued at (iat) is in the future", () => {
        it("Returns error response", () => {
          const tokenService = new TokenService();
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.setIat(Math.floor(Date.now() + 1000) / 1000);
          const authorizationHeader = `Bearer ${jwtBuilder.getEncodedJwt()}`;

          const result = tokenService.getDecodedToken({
            authorizationHeader,
            issuer: "mockIssuer",
          });

          expect(result.isError).toEqual(true);
          expect(result.value).toStrictEqual({
            errorMessage: "iat claim is in the future",
            errorCategory: "CLIENT_ERROR",
          });
        });
      });
    });

    describe("Given nfb claim is invalid", () => {
      describe("Given not before (nbf) is in the future", () => {
        it("Returns error response", () => {
          const tokenService = new TokenService();
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.setNbf(Date.now() + 1000);
          const authorizationHeader = `Bearer ${jwtBuilder.getEncodedJwt()}`;

          const result = tokenService.getDecodedToken({
            authorizationHeader,
            issuer: "mockIssuer",
          });

          expect(result.isError).toEqual(true);
          expect(result.value).toStrictEqual({
            errorMessage: "nbf claim is in the future",
            errorCategory: "CLIENT_ERROR",
          });
        });
      });
    });

    describe("Given iss claim is invalid", () => {
      describe("Given issuer (iss) is missing", () => {
        it("Returns error response", () => {
          const tokenService = new TokenService();
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.deleteIss();
          const authorizationHeader = `Bearer ${jwtBuilder.getEncodedJwt()}`;

          const result = tokenService.getDecodedToken({
            authorizationHeader,
            issuer: "mockIssuer",
          });

          expect(result.isError).toEqual(true);
          expect(result.value).toStrictEqual({
            errorMessage: "Missing iss claim",
            errorCategory: "CLIENT_ERROR",
          });
        });
      });

      describe("Given issuer (iss) is does not match environment variable", () => {
        it("Returns error response", () => {
          const tokenService = new TokenService();
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.setIss("invalidIss");
          const authorizationHeader = `Bearer ${jwtBuilder.getEncodedJwt()}`;

          const result = tokenService.getDecodedToken({
            authorizationHeader,
            issuer: "mockIssuer",
          });

          expect(result.isError).toEqual(true);
          expect(result.value).toStrictEqual({
            errorMessage:
              "iss claim does not match ISSUER environment variable",
            errorCategory: "CLIENT_ERROR",
          });
        });
      });
    });

    describe("Given scope claim is invalid", () => {
      describe("Given scope is missing", () => {
        it("Returns error response", () => {
          const tokenService = new TokenService();
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.deleteScope();
          const authorizationHeader = `Bearer ${jwtBuilder.getEncodedJwt()}`;

          const result = tokenService.getDecodedToken({
            authorizationHeader,
            issuer: "mockIssuer",
          });

          expect(result.isError).toEqual(true);
          expect(result.value).toStrictEqual({
            errorMessage: "Missing scope claim",
            errorCategory: "CLIENT_ERROR",
          });
        });
      });
      describe("Given scope is not dcmaw.session.async_create", () => {
        it("Returns error response", () => {
          const tokenService = new TokenService();
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.setScope("invalidScope");
          const authorizationHeader = `Bearer ${jwtBuilder.getEncodedJwt()}`;

          const result = tokenService.getDecodedToken({
            authorizationHeader,
            issuer: "mockIssuer",
          });

          expect(result.isError).toEqual(true);
          expect(result.value).toStrictEqual({
            errorMessage: "Invalid scope claim",
            errorCategory: "CLIENT_ERROR",
          });
        });
      });
    });

    describe("Given client_id claim is invalid", () => {
      describe("Given client_id is missing", () => {
        it("Returns error response", () => {
          const tokenService = new TokenService();
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.deleteClientId();
          const authorizationHeader = `Bearer ${jwtBuilder.getEncodedJwt()}`;

          const result = tokenService.getDecodedToken({
            authorizationHeader,
            issuer: "mockIssuer",
          });

          expect(result.isError).toEqual(true);
          expect(result.value).toStrictEqual({
            errorMessage: "Missing client_id claim",
            errorCategory: "CLIENT_ERROR",
          });
        });
      });
    });

    describe("Given aud claim is invalid", () => {
      describe("Given aud (audience) is missing", () => {
        it("Returns error response", () => {
          const tokenService = new TokenService();
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.deleteAud();
          const authorizationHeader = `Bearer ${jwtBuilder.getEncodedJwt()}`;

          const result = tokenService.getDecodedToken({
            authorizationHeader,
            issuer: "mockIssuer",
          });

          expect(result.isError).toEqual(true);
          expect(result.value).toStrictEqual({
            errorMessage: "Missing aud claim",
            errorCategory: "CLIENT_ERROR",
          });
        });
      });
    });

    describe("Given all claims are valid", () => {
      it("Returns success response with encodedJwt and JwtPayload", () => {
        const tokenService = new TokenService();
        const jwtBuilder = new MockJWTBuilder();
        jwtBuilder.setExp(1721901143000);
        const authorizationHeader = `Bearer ${jwtBuilder.getEncodedJwt()}`;

        const result = tokenService.getDecodedToken({
          authorizationHeader,
          issuer: "mockIssuer",
        });

        expect(result.isError).toEqual(false);
        expect(result.value).toEqual({
          encodedJwt:
            "eyJhbGciOiJIUzI1NiIsInR5cGUiOiJKV1QifQ.eyJleHAiOjE3MjE5MDExNDMwMDAsImlzcyI6Im1vY2tJc3N1ZXIiLCJhdWQiOiJtb2NrSXNzdWVyIiwic2NvcGUiOiJkY21hdy5zZXNzaW9uLmFzeW5jX2NyZWF0ZSIsImNsaWVudF9pZCI6Im1vY2tDbGllbnRJZCJ9.Ik_kbkTVKzlXadti994bAtiHaFO1KsD4_yJGt4wpjr8",
          jwtPayload: {
            aud: "mockIssuer",
            client_id: "mockClientId",
            exp: 1721901143000,
            iss: "mockIssuer",
            scope: "dcmaw.session.async_create",
          },
        });
      });
    });
  });

  describe("JWT signature verification", () => {
    // Generated using jwt.io with their public and private keys
    const mockJwt =
      "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.tyh-VfuzIxCyGYDlkBA7DfyjrqmSHu6pQ2hoZuFqUSLPNY2N0mpHb3nk5K17HWP_3cYHBw7AhHale5wky6-sVA";

    describe("Given KMS cannot calculate signature validity", () => {
      it("Returns a log", async () => {
        const kmsMock = mockClient(KMSClient);
        kmsMock.on(VerifyCommand).resolves({});
        const tokenService = new TokenService();
        const result = await tokenService.verifyTokenSignature(
          "mockKeyId",
          mockJwt,
        );
        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Signature is invalid",
          errorCategory: "CLIENT_ERROR",
        });
      });
    });

    describe("Given the token signature is not valid", () => {
      it("Returns a log", async () => {
        const kmsMock = mockClient(KMSClient);
        kmsMock.on(VerifyCommand).resolves({ SignatureValid: false });
        const tokenService = new TokenService();
        const result = await tokenService.verifyTokenSignature(
          "mockKeyId",
          mockJwt,
        );
        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Signature is invalid",
          errorCategory: "CLIENT_ERROR",
        });
      });
    });

    describe("Given the token signature is valid", () => {
      it("Returns a value of null", async () => {
        const kmsMock = mockClient(KMSClient);
        kmsMock.on(VerifyCommand).resolves({ SignatureValid: true });
        const tokenService = new TokenService();
        const result = await tokenService.verifyTokenSignature(
          "mockKeyId",
          mockJwt,
        );
        expect(result.isError).toBe(false);
        expect(result.value).toEqual(null);
      });
    });
  });
});
