import { APIGatewayProxyResult } from "aws-lambda";
import { Dependencies, lambdaHandler } from "./asyncCredentialHandler";
import { buildRequest } from "../testUtils/mockRequest";
import { IVerifyTokenSignature } from "./TokenService/tokenService.test";
import { TokenService } from "./TokenService/tokenService.test";
import { LogOrValue, log } from "../types/logOrValue";

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
        expect(result).toEqual({
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
        expect(result).toEqual({
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
        expect(result).toEqual({
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
        expect(result).toEqual({
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

        expect(result).toEqual({
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
