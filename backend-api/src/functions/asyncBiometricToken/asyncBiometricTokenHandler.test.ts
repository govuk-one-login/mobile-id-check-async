import { Context } from "aws-lambda";
import { Logger } from "../services/logging/logger";
import { MockLoggingAdapter } from "../services/logging/tests/mockLogger";
import { buildLambdaContext } from "../testUtils/mockContext";
import { buildRequest } from "../testUtils/mockRequest";
import { lambdaHandlerConstructor } from "./asyncBiometricTokenHandler";
import { IAsyncBiometricTokenDependencies } from "./handlerDependencies";
import { MessageName, registeredLogs } from "./registeredLogs";
import {
  expectedSecurityHeaders,
  mockSessionId,
} from "../testUtils/unitTestData";

describe("Async Biometric Token", () => {
  let dependencies: IAsyncBiometricTokenDependencies;
  let context: Context;
  let mockLoggingAdapter: MockLoggingAdapter<MessageName>;

  beforeEach(() => {
    mockLoggingAdapter = new MockLoggingAdapter();
    dependencies = {
      logger: () => new Logger(mockLoggingAdapter, registeredLogs),
    };
    context = buildLambdaContext();
  });

  describe("Request body validation", () => {
    describe("Given request body is invalid", () => {
      const request = buildRequest({
        body: JSON.stringify({
          sessionId: mockSessionId,
          documentType: "BUS_PASS",
        }),
      });

      it("Logs BIOMETRIC_TOKEN_REQUEST_BODY_INVALID", async () => {
        await lambdaHandlerConstructor(dependencies, request, context);

        expect(mockLoggingAdapter.getLogMessages()[1].logMessage.message).toBe(
          "BIOMETRIC_TOKEN_REQUEST_BODY_INVALID",
        );
        expect(mockLoggingAdapter.getLogMessages()[1].data).toStrictEqual({
          errorMessage:
            "documentType in request body is invalid. documentType: BUS_PASS",
        });
      });

      it("Returns 400 Bad Request response", async () => {
        const result = await lambdaHandlerConstructor(
          dependencies,
          request,
          context,
        );

        expect(result).toStrictEqual({
          headers: expectedSecurityHeaders,
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
    const request = buildRequest({
      body: JSON.stringify({
        sessionId: mockSessionId,
        documentType: "NFC_PASSPORT",
      }),
    });

    it("Logs STARTED and COMPLETED", async () => {
      await lambdaHandlerConstructor(dependencies, request, context);

      expect(
        mockLoggingAdapter.getLogMessages()[0].logMessage.message,
      ).toStrictEqual("STARTED");
      expect(
        mockLoggingAdapter.getLogMessages()[1].logMessage.message,
      ).toStrictEqual("COMPLETED");
    });

    it("Returns 501 Not Implemented response", async () => {
      const result = await lambdaHandlerConstructor(
        dependencies,
        request,
        context,
      );

      expect(result).toStrictEqual({
        headers: expectedSecurityHeaders,
        statusCode: 501,
        body: JSON.stringify({ error: "Not Implemented" }),
      });
    });
  });
});
