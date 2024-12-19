import { Context } from "aws-lambda";
import { Logger } from "../services/logging/logger";
import { MockLoggingAdapter } from "../services/logging/tests/mockLogger";
import { buildLambdaContext } from "../testUtils/mockContext";
import { buildRequest } from "../testUtils/mockRequest";
import { lambdaHandlerConstructor } from "./asyncBiometricTokenHandler";
import { IAsyncBiometricTokenDependencies } from "./handlerDependencies";
import { MessageName, registeredLogs } from "./registeredLogs";

describe("Async Biometric Token", () => {
  let dependencies: IAsyncBiometricTokenDependencies;
  let mockLoggingAdapter: MockLoggingAdapter<MessageName>;
  let context: Context;

  beforeEach(() => {
    mockLoggingAdapter = new MockLoggingAdapter();
    dependencies = {
      logger: () => new Logger(mockLoggingAdapter, registeredLogs),
    };
    context = buildLambdaContext();
  });
  describe("Request body validation", () => {
    describe("Given request body is invalid", () => {
      it("Logs and returns 400 Bad Request response", async () => {
        const request = buildRequest({
          body: JSON.stringify({
            sessionId: "58f4281d-d988-49ce-9586-6ef70a2be0b4",
          }),
        });

        const result = await lambdaHandlerConstructor(
          dependencies,
          request,
          context,
        );

        expect(mockLoggingAdapter.getLogMessages()[1].logMessage.message).toBe(
          "REQUEST_BODY_INVALID",
        );
        expect(mockLoggingAdapter.getLogMessages()[1].data).toStrictEqual({
          errorMessage:
            "documentType in request body is either null or undefined. documentType: undefined",
        });
        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "Request body invalid",
          }),
        });
      });
    });
  });

  describe("Given a valid request is made", () => {
    it("Logs and returns 501 Not Implemented response", async () => {
      const request = buildRequest({
        body: JSON.stringify({
          sessionId: "58f4281d-d988-49ce-9586-6ef70a2be0b4",
          documentType: "NFC_PASSPORT",
        }),
      });
      const context = buildLambdaContext();

      const result = await lambdaHandlerConstructor(
        dependencies,
        request,
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
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
        },
        statusCode: 501,
        body: JSON.stringify({ error: "Not Implemented" }),
      });
    });
  });
});
