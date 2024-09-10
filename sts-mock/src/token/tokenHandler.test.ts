import { Logger } from "../services/logging/logger";
import { MockLoggingAdapter } from "../services/logging/tests/mockLoggingAdapter";
import { buildLambdaContext } from "../testUtils/mockContext";
import { registeredLogs } from "./registeredLogs";
import { lambdaHandlerConstructor } from "./tokenHandler";

describe("Token", () => {
  describe("Given lambdaHandler is called", () => {
    it("Returns 200 response", async () => {
      const mockLoggingAdapter = new MockLoggingAdapter();
      const dependencies = {
        env: {},
        logger: () => new Logger(mockLoggingAdapter, registeredLogs),
      };
      const result = await lambdaHandlerConstructor(
        dependencies,
        buildLambdaContext(),
      );

      expect(mockLoggingAdapter.getLogMessages()[0].logMessage.message).toBe(
        "STARTED",
      );
      expect(mockLoggingAdapter.getLogMessages()[1].logMessage.message).toBe(
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
