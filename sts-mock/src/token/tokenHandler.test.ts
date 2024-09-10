import { lambdaHandlerConstructor } from "./tokenHandler";

describe("Token", () => {
  describe("Given lambdaHandler is called", () => {
    it("Returns 200 response", async () => {
      const result = await lambdaHandlerConstructor();

      expect(mockLogger.getLogMessages()[0].logMessage.message).toBe(
        "STARTED",
      );

      expect(mockLogger.getLogMessages()[1].logMessage.message).toBe(
        "COMPLETED",
      );

      expect(result).toStrictEqual({
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          Pragma: "no-cache",
        },
        statusCode: 200,
        body: JSON.stringify({
          access_token: "accessToken",
          token_type: "Bearer",
          expires_in: 3600,
        }),
      });
    });
  });
});
