
import { Logger } from "../services/logging/logger";
import { MockLoggingAdapter } from "../services/logging/tests/mockLogger";
import { buildLambdaContext } from "../testUtils/mockContext";
import { buildRequest } from "../testUtils/mockRequest";
import { lambdaHandlerConstructor } from "./asyncBiometricTokenHandler";
import { IAsyncBiometricTokenDependencies } from "./handlerDependencies";
import { MessageName, registeredLogs } from "./registeredLogs";

describe("Async Biometric Token", () => {
  let dependencies: IAsyncBiometricTokenDependencies
  let mockLoggingAdapter: MockLoggingAdapter<MessageName>;

  beforeEach(() => {
    mockLoggingAdapter = new MockLoggingAdapter();
    dependencies = {
      logger: () => new Logger(mockLoggingAdapter, registeredLogs),
    };
  })
  describe("Request body validation", () => {
    describe("Given request body is not present", () => {
      it("Logs and returns 400 Bad Request response", async () => {
        const context = buildLambdaContext();
        const event = buildRequest({ body: undefined });

        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          context,
        );

        expect(mockLoggingAdapter.getLogMessages()[1].logMessage.message).toBe(
          "REQUEST_BODY_INVALID",
        );
        expect(mockLoggingAdapter.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "Request body is either null or undefined",
        });
        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "Request body is either null or undefined",
          }),
        });
      })
    })

    describe("Given request body cannot be parsed as JSON", () => {
      it("Logs and returns 400 Bad Request response", async () => {
        const context = buildLambdaContext();
        const event = buildRequest({ body: 'foo' });

        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          context,
        );

        expect(mockLoggingAdapter.getLogMessages()[1].logMessage.message).toBe(
          "REQUEST_BODY_INVALID",
        );
        expect(mockLoggingAdapter.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "Request body could not be parsed as JSON",
        });
        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "Request body could not be parsed as JSON",
          }),
        });
      })
    })

    describe("Given sessionId is not present in request body", () => {
      it("Logs and returns 400 Bad Request response", async () => {
        const event = buildRequest({
          body: JSON.stringify({})
        })
        const context = buildLambdaContext();

        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          context,
        );

        expect(mockLoggingAdapter.getLogMessages()[1].logMessage.message).toBe(
          "REQUEST_BODY_INVALID",
        );
        expect(mockLoggingAdapter.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "sessionId in request body is either null or undefined",
        });
        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "sessionId in request body is either null or undefined",
          }),
        });
      })
    })

    describe("Given sessionId is not a valid string in request body", () => {
      it("Logs and returns 400 Bad Request response", async () => {
        const event = buildRequest({
          body: JSON.stringify({ "sessionId": 123 })
        })
        const context = buildLambdaContext();

        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          context,
        );

        expect(mockLoggingAdapter.getLogMessages()[1].logMessage.message).toBe(
          "REQUEST_BODY_INVALID",
        );
        expect(mockLoggingAdapter.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "sessionId in request body is not of type string",
        });
        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "sessionId in request body is not of type string",
          }),
        });
      })
    })

    describe("Given sessionId is an empty string", () => {
      it("Logs and returns 400 Bad Request response", async () => {
        const event = buildRequest({
          body: JSON.stringify({ "sessionId": "" })
        })
        const context = buildLambdaContext();

        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          context,
        );

        expect(mockLoggingAdapter.getLogMessages()[1].logMessage.message).toBe(
          "REQUEST_BODY_INVALID",
        );
        expect(mockLoggingAdapter.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "sessionId in request body is an empty string",
        });
        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "sessionId in request body is an empty string",
          }),
        });
      })
    })

    describe("Given documentType is not present in request body", () => {
      it("Logs and returns 400 Bad Request response", async () => {
        const event = buildRequest({
          body: JSON.stringify({ "sessionId": "58f4281d-d988-49ce-9586-6ef70a2be0b4" })
        })
        const context = buildLambdaContext();

        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          context,
        );

        expect(mockLoggingAdapter.getLogMessages()[1].logMessage.message).toBe(
          "REQUEST_BODY_INVALID",
        );
        expect(mockLoggingAdapter.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "documentType in request body is either null or undefined",
        });
        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "documentType in request body is either null or undefined",
          }),
        });
      })
    })

    describe("Given documentType is not a valid string in request body", () => {
      it("Logs and returns 400 Bad Request response", async () => {
        const event = buildRequest({
          body: JSON.stringify({
            "sessionId": "58f4281d-d988-49ce-9586-6ef70a2be0b4",
            "documentType": 123,
          })
        })
        const context = buildLambdaContext();

        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          context,
        );

        expect(mockLoggingAdapter.getLogMessages()[1].logMessage.message).toBe(
          "REQUEST_BODY_INVALID",
        );
        expect(mockLoggingAdapter.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "documentType in request body is not of type string",
        });
        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "documentType in request body is not of type string",
          }),
        });
      })
    })

    describe("Given documentType is an empty string", () => {
      it("Logs and returns 400 Bad Request response", async () => {
        const event = buildRequest({
          body: JSON.stringify({
            "sessionId": "58f4281d-d988-49ce-9586-6ef70a2be0b4",
            "documentType": "",
          })
        })
        const context = buildLambdaContext();

        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          context,
        );

        expect(mockLoggingAdapter.getLogMessages()[1].logMessage.message).toBe(
          "REQUEST_BODY_INVALID",
        );
        expect(mockLoggingAdapter.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "documentType in request body is an empty string",
        });
        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "documentType in request body is an empty string",
          }),
        });
      })
    })

    describe("Given documentType is an invalid document type", () => {
      it("Logs and returns 400 Bad Request response", async () => {
        const event = buildRequest({
          body: JSON.stringify({
            "sessionId": "58f4281d-d988-49ce-9586-6ef70a2be0b4",
            "documentType": "BUS_PASS",
          })
        })
        const context = buildLambdaContext();

        const result = await lambdaHandlerConstructor(
          dependencies,
          event,
          context,
        );

        expect(mockLoggingAdapter.getLogMessages()[1].logMessage.message).toBe(
          "REQUEST_BODY_INVALID",
        );
        expect(mockLoggingAdapter.getLogMessages()[1].data).toStrictEqual({
          errorMessage: "documentType in request body is invalid",
        });
        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 400,
          body: JSON.stringify({
            error: "invalid_request",
            error_description: "documentType in request body is invalid",
          }),
        });
      })
    })
  })
  describe("Given a valid request is made", () => {
    it("Logs and returns 501 Not Implemented response", async () => {
      const event = buildRequest({
        body: JSON.stringify({
          "sessionId": "58f4281d-d988-49ce-9586-6ef70a2be0b4",
          "documentType": "NFC_PASSPORT",
        })
      })
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
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
        },
        statusCode: 501,
        body: JSON.stringify({ error: "Not Implemented" }),
      });
    });
  });
});
