import { APIGatewayProxyResult, Context } from "aws-lambda";
import { Logger } from "../services/logging/logger";
import { MockLoggingAdapter } from "../services/logging/tests/mockLogger";
import { buildLambdaContext } from "../testUtils/mockContext";
import { buildRequest } from "../testUtils/mockRequest";
import { lambdaHandlerConstructor } from "./asyncBiometricTokenHandler";
import { IAsyncBiometricTokenDependencies } from "./handlerDependencies";
import { MessageName, registeredLogs } from "./registeredLogs";

describe("Async Biometric Token", () => {
  let dependencies: IAsyncBiometricTokenDependencies;
  let result: APIGatewayProxyResult;
  let context: Context;
  let mockLoggingAdapter: MockLoggingAdapter<MessageName>;
  const sessionId = "58f4281d-d988-49ce-9586-6ef70a2be0b4";

  beforeEach(() => {
    mockLoggingAdapter = new MockLoggingAdapter();
    dependencies = {
      logger: () => new Logger(mockLoggingAdapter, registeredLogs),
    };
    context = buildLambdaContext();
  });

  describe("Request body validation", () => {
    describe("Given request body is invalid", () => {
      beforeEach(async () => {
        const request = buildRequest({
          body: JSON.stringify({
            sessionId,
            documentType: "BUS_PASS",
          }),
        });

        result = await lambdaHandlerConstructor(dependencies, request, context);
      });

      it("Logs BIOMETRIC_TOKEN_REQUEST_BODY_INVALID", async () => {
        expect(mockLoggingAdapter.getLogMessages()[1].logMessage.message).toBe(
          "BIOMETRIC_TOKEN_REQUEST_BODY_INVALID",
        );
        expect(mockLoggingAdapter.getLogMessages()[1].data).toStrictEqual({
          errorMessage:
            "documentType in request body is invalid. documentType: BUS_PASS",
        });
      });

      it("Returns 400 Bad Request response", async () => {
        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description:
              "documentType in request body is invalid. documentType: BUS_PASS",
          }),
        });
      });
    });
  });

  describe("Given a valid request is made", () => {
    beforeEach(async () => {
      const request = buildRequest({
        body: JSON.stringify({
          sessionId,
          documentType: "NFC_PASSPORT",
        }),
      });

      result = await lambdaHandlerConstructor(dependencies, request, context);
    });

    it("Logs STARTED and COMPLETED", async () => {
      expect(
        mockLoggingAdapter.getLogMessages()[0].logMessage.message,
      ).toStrictEqual("STARTED");
      expect(
        mockLoggingAdapter.getLogMessages()[1].logMessage.message,
      ).toStrictEqual("COMPLETED");
    });

    it("Returns 501 Not Implemented response", async () => {
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
