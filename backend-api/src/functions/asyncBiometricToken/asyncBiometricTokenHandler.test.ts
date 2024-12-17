import { Logger } from "../services/logging/logger";
import { MockLoggingAdapter } from "../services/logging/tests/mockLogger";
import { buildLambdaContext } from "../testUtils/mockContext";
import { buildRequest } from "../testUtils/mockRequest";
import { lambdaHandlerConstructor } from "./asyncBiometricTokenHandler";
import { registeredLogs } from "./registeredLogs";

describe("Async Biometric Token", () => {
  describe("Given a request is made", () => {
    it("Returns 501 Not Implemented response", async () => {
      const mockLoggingAdapter = new MockLoggingAdapter();
      const dependencies = {
        logger: () => new Logger(mockLoggingAdapter, registeredLogs),
      };
      const event = buildRequest();
      const context = buildLambdaContext();

      const result = await lambdaHandlerConstructor(
        dependencies,
        event,
        context,
      );

      expect(
        mockLoggingAdapter.getLogMessages()[0].logMessage.message,
      ).toStrictEqual("STARTED");
      expect(
        mockLoggingAdapter.getLogMessages()[1].logMessage.message,
      ).toStrictEqual("COMPLETED");

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
