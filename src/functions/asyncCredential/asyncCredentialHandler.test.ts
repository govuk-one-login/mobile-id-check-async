import { APIGatewayProxyResult } from "aws-lambda";
import { lambdaHandler } from "./asyncCredentialHandler";
import { buildRequest } from "../testUtils/mockRequest";

describe("Async Credential", () => {
  describe("Access token validation", () => {
    describe("Given access token payload is not present", () => {
      it("Returns 401 Unauthorized", async () => {
        const event = buildRequest();

        const result: APIGatewayProxyResult = await lambdaHandler(event);
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

        const result: APIGatewayProxyResult = await lambdaHandler(event);
        expect(result).toEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 401,
          body: "Unauthorized",
        });
      });
    });

    describe("Given Bearer token is not in expected format", () => {
      it("Returns 401 Unauthorized", async () => {
        const event = buildRequest({
          headers: { Authorization: "Bearer " },
        });

        const result: APIGatewayProxyResult = await lambdaHandler(event);
        expect(result).toEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 401,
          body: "Unauthorized",
        });
      });
    });
  });
});
