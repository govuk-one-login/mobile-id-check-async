import { APIGatewayProxyResult } from "aws-lambda";
import { buildRequest } from "../testUtils/mockRequest";
import { LogOrValue, log, value } from "../types/logOrValue";
import {
  IValidateTokenPayload,
  IVerifyTokenSignature,
  TokenService,
} from "./TokenService/tokenService.test";
import { Dependencies, lambdaHandler } from "./asyncCredentialHandler";

const mockJwtNoExp =
  "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.0C_S0NEicI6k1yaTAV0l85Z0SlW3HI2YIqJb_unXZ1MttAvjR9wAOhsl_0X20i1NYN0ZhnaoHnGLpApUSz2kwQ";
const mockJwtIatInTheFuture =
  "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoiMjE0NTk2NDY5NSIsImlhdCI6IjIxNDU5NjQ2OTUifQ.VnfFwIElQqPwbayMqLz-YaUK-BOx9tEKJE4_N49xh65TQvtP-9EWaPgD0D0C_3hULWjtvt2gh46nTPi-m7-y4A";
const mockJwtExpInThePast =
  "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.LMHQh9wrANRpJYdQsP1oOVsrDEFTTJTYgpUVBy_w1Jd8GFRLwbenFEjFyXr2PZF-COP9xI87vpEOtrAri3ge8A";

const mockJwtNbfInFuture =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoiMTUxNjIzOTAyMiIsImV4cCI6IjIxNDU5NjQ2OTUiLCJuYmYiOiIyMTQ1OTY0Njk1In0.7-OeXAHrUdvRirCd_7H_yxFf8aGzkGIk944gqAbCBVM";
describe("Async Credential", () => {
  let dependencies: Dependencies;

  beforeEach(() => {
    dependencies = {
      tokenService: () => new TokenService(),
    };
  });
  describe("Access token validation", () => {
    describe("Given access token payload is not present", () => {
      it("Returns 401 Unauthorized", async () => {
        const event = buildRequest();

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );
        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 401,
          body: "Unauthorized",
        });
      });
    });

    describe("Given access token does not start with Bearer", () => {
      it("Returns 401 Unauthorized", async () => {
        const event = buildRequest({
          headers: { Authorization: "noBearerString mockToken" },
        });

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );
        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 401,
          body: "Unauthorized",
        });
      });
    });

    describe("Given Bearer token is not in expected format - contains spaces", () => {
      it("Returns 401 Unauthorized", async () => {
        const event = buildRequest({
          headers: { Authorization: "Bearer mock token" },
        });

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );
        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 401,
          body: "Unauthorized",
        });
      });
    });

    describe("Given Bearer token is not in expected format - missing token", () => {
      it("Returns 401 Unauthorized", async () => {
        const event = buildRequest({
          headers: { Authorization: "Bearer " },
        });

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );
        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 401,
          body: "Unauthorized",
        });
      });
    });
  });

  describe("JWT payload validation", () => {
    describe("exp claim validation", () => {
      describe("Given expiry date is not present", () => {
        it("Returns a log", async () => {
          const event = buildRequest({
            headers: { Authorization: `Bearer ${mockJwtNoExp}` },
          });

          dependencies.tokenService = () => new MockTokenSeviceValidSignature();

          const result: APIGatewayProxyResult = await lambdaHandler(
            event,
            dependencies,
          );

          expect(result).toStrictEqual({
            headers: { "Content-Type": "application/json" },
            statusCode: 401,
            body: "Unauthorized",
          });
        });
      });

      describe("Given expiry date is in the past", () => {
        it("Returns a log", async () => {
          const event = buildRequest({
            headers: { Authorization: `Bearer ${mockJwtExpInThePast}` },
          });

          dependencies.tokenService = () => new MockTokenSeviceValidSignature();

          const result: APIGatewayProxyResult = await lambdaHandler(
            event,
            dependencies,
          );

          expect(result).toStrictEqual({
            headers: { "Content-Type": "application/json" },
            statusCode: 401,
            body: "Unauthorized",
          });
        });
      });
    });

    describe("iat claim validation", () => {
      // iat does not need to be present
      describe("Given issued at (iat) is in the future", () => {
        it("Returns a log", async () => {
          const event = buildRequest({
            headers: { Authorization: `Bearer ${mockJwtIatInTheFuture}` },
          });

          dependencies.tokenService = () => new MockTokenSeviceValidSignature();

          const result: APIGatewayProxyResult = await lambdaHandler(
            event,
            dependencies,
          );

          expect(result).toStrictEqual({
            headers: { "Content-Type": "application/json" },
            statusCode: 401,
            body: "Unauthorized",
          });
        });
      });
    });
  });

  describe("nbf claim validation", () => {
    // nbf does not need to be present
    describe("Given not before (nbf) is in the future", () => {
      it("Returns a log", async () => {
        const event = buildRequest({
          headers: { Authorization: `Bearer ${mockJwtNbfInFuture}` },
        });

        dependencies.tokenService = () => new MockTokenSeviceValidSignature();

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 401,
          body: "Unauthorized",
        });
      });
    });
  });

  describe("JWT signature verification", () => {
    describe("Given that the JWT signature verification fails", () => {
      it("Returns 401 Unauthorized", async () => {
        dependencies.tokenService = () => new MockTokenSeviceInvalidSignature();

        const event = buildRequest({
          headers: { Authorization: "Bearer mockToken" },
        });

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 401,
          body: "Unauthorized",
        });
      });
    });
  });
});

class MockTokenSeviceInvalidSignature implements IVerifyTokenSignature {
  verifyTokenSignature(): Promise<LogOrValue<null>> {
    return Promise.resolve(log(""));
  }
}

class MockTokenSeviceValidSignature implements IVerifyTokenSignature {
  verifyTokenSignature(): Promise<LogOrValue<null>> {
    return Promise.resolve(value(null));
  }
}
