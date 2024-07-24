import { KMSClient, VerifyCommand } from "@aws-sdk/client-kms";
import { mockClient } from "aws-sdk-client-mock";
import { TokenService } from "./tokenService";
import { MockJWTBuilder } from "../../testUtils/mockJwt";

describe("Token Service", () => {
  describe("Verify token claims", () => {
    describe("exp claim", () => {
      describe("Given expiry date is missing", () => {
        it("Returns error response", () => {
          const tokenService = new TokenService();
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.deleteExp();
          const encodedJwt = jwtBuilder.getEncodedJwt();
          const payload = encodedJwt.split(".")[1];
          const jwtPayload = JSON.parse(
            Buffer.from(payload, "base64").toString("utf-8"),
          );

          const result = tokenService.verifyTokenClaims(
            jwtPayload,
            "mockIssuer",
          );

          expect(result.isError).toEqual(true);
          expect(result.value).toEqual("Missing exp claim");
        });
      });

      describe("Given expiry date is in the past", () => {
        it("Returns error response", () => {
          const tokenService = new TokenService();
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.setExp(Math.floor(Date.now() - 1000) / 1000);
          const encodedJwt = jwtBuilder.getEncodedJwt();
          const payload = encodedJwt.split(".")[1];
          const jwtPayload = JSON.parse(
            Buffer.from(payload, "base64").toString("utf-8"),
          );

          const result = tokenService.verifyTokenClaims(
            jwtPayload,
            "mockIssuer",
          );

          expect(result.isError).toEqual(true);
          expect(result.value).toEqual("exp claim is in the past");
        });
      });
    });

    describe("iat claim", () => {
      describe("Given issued at (iat) is in the future", () => {
        it("Returns error response", () => {
          const tokenService = new TokenService();
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.setIat(Math.floor(Date.now() + 1000) / 1000);
          const encodedJwt = jwtBuilder.getEncodedJwt();
          const payload = encodedJwt.split(".")[1];
          const jwtPayload = JSON.parse(
            Buffer.from(payload, "base64").toString("utf-8"),
          );

          const result = tokenService.verifyTokenClaims(
            jwtPayload,
            "mockIssuer",
          );

          expect(result.isError).toEqual(true);
          expect(result.value).toEqual("iat claim is in the future");
        });
      });
    });

    describe("nfb claim", () => {
      describe("Given not before (nbf) is in the future", () => {
        it("Returns error response", () => {
          const tokenService = new TokenService();
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.setNbf(Date.now() + 1000);
          const encodedJwt = jwtBuilder.getEncodedJwt();
          const payload = encodedJwt.split(".")[1];
          const jwtPayload = JSON.parse(
            Buffer.from(payload, "base64").toString("utf-8"),
          );

          const result = tokenService.verifyTokenClaims(
            jwtPayload,
            "mockIssuer",
          );

          expect(result.isError).toEqual(true);
          expect(result.value).toEqual("nbf claim is in the future");
        });
      });
    });

    describe("iss claim", () => {
      describe("Given issuer (iss) is missing", () => {
        it("Returns error response", () => {
          const tokenService = new TokenService();
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.deleteIss();
          const encodedJwt = jwtBuilder.getEncodedJwt();
          const payload = encodedJwt.split(".")[1];
          const jwtPayload = JSON.parse(
            Buffer.from(payload, "base64").toString("utf-8"),
          );

          const result = tokenService.verifyTokenClaims(
            jwtPayload,
            "mockIssuer",
          );

          expect(result.isError).toEqual(true);
          expect(result.value).toEqual("Missing iss claim");
        });
      });

      describe("Given issuer (iss) is does not match environment variable", () => {
        it("Returns error response", () => {
          const tokenService = new TokenService();
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.setIss("invalidIss");
          const encodedJwt = jwtBuilder.getEncodedJwt();
          const payload = encodedJwt.split(".")[1];
          const jwtPayload = JSON.parse(
            Buffer.from(payload, "base64").toString("utf-8"),
          );

          const result = tokenService.verifyTokenClaims(
            jwtPayload,
            "mockIssuer",
          );

          expect(result.isError).toEqual(true);
          expect(result.value).toEqual(
            "iss claim does not match ISSUER environment variable",
          );
        });
      });
    });

    describe("scope claim", () => {
      describe("Given scope is not dcmaw.session.async_create", () => {
        it("Returns error response", () => {
          const tokenService = new TokenService();
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.setScope("invalidScope");
          const encodedJwt = jwtBuilder.getEncodedJwt();
          const payload = encodedJwt.split(".")[1];
          const jwtPayload = JSON.parse(
            Buffer.from(payload, "base64").toString("utf-8"),
          );

          const result = tokenService.verifyTokenClaims(
            jwtPayload,
            "mockIssuer",
          );

          expect(result.isError).toEqual(true);
          expect(result.value).toEqual("Invalid scope claim");
        });
      });
    });

    describe("client_id claim", () => {
      describe("Given client_id is missing", () => {
        it("Returns error response", () => {
          const tokenService = new TokenService();
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.deleteClientId();
          const encodedJwt = jwtBuilder.getEncodedJwt();
          const payload = encodedJwt.split(".")[1];
          const jwtPayload = JSON.parse(
            Buffer.from(payload, "base64").toString("utf-8"),
          );

          const result = tokenService.verifyTokenClaims(
            jwtPayload,
            "mockIssuer",
          );

          expect(result.isError).toEqual(true);
          expect(result.value).toEqual("Missing client_id claim");
        });
      });
    });

    describe("client_id claim", () => {
      describe("Given aud (audience) is missing", () => {
        it("Returns error response", () => {
          const tokenService = new TokenService();
          const jwtBuilder = new MockJWTBuilder();
          jwtBuilder.deleteAud();
          const encodedJwt = jwtBuilder.getEncodedJwt();
          const payload = encodedJwt.split(".")[1];
          const jwtPayload = JSON.parse(
            Buffer.from(payload, "base64").toString("utf-8"),
          );

          const result = tokenService.verifyTokenClaims(
            jwtPayload,
            "mockIssuer",
          );

          expect(result.isError).toEqual(true);
          expect(result.value).toEqual("Missing aud claim");
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
        expect(result.value).toEqual("Signature is invalid");
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
        expect(result.value).toEqual("Signature is invalid");
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
