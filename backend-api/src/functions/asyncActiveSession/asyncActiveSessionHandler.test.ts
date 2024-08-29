import { lambdaHandler } from "./asyncActiveSessionHandler";

describe("Async Active Session", () => {
  describe("Given a request is received", () => {
    it("Returns 200 response", async () => {
      const result = await lambdaHandler();

      expect(result).toStrictEqual({
        statusCode: 200,
        body: "Hello, World",
      });
    });
  });
});
