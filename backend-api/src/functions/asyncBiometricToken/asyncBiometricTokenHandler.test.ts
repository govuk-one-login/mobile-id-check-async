import { lambdaHandler } from "./asyncBiometricTokenHandler";

describe("Async Biometric Token", () => {
  describe("Given a request is made", () => {
    it("Returns 501 Not Implemented response", async () => {
      const result = await lambdaHandler();

      expect(result).toStrictEqual({
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "application/json",
          "Strict-Transport-Security": "max-age=31536000",
          "X-Content-Type-Options": " nosniff",
          "X-Frame-Options": "DENY",
        },
        statusCode: 501,
        body: JSON.stringify({ error: "Not Implemented" }),
      });
    });
  });
});
