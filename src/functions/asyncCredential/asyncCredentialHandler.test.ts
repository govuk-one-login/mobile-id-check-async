import { APIGatewayProxyResult } from "aws-lambda";
import { lambdaHandler } from "./asyncCredentialHandler";
import { buildRequest } from "../testUtils/mockRequest";

describe("Async Credential", () => {
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
});
