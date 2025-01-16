import { expect } from "@jest/globals";
import "../testUtils/matchers";
import "dotenv/config";
import { APIGatewayProxyResult, Context } from "aws-lambda";
import { buildLambdaContext } from "../testUtils/mockContext";
import { buildRequest } from "../testUtils/mockRequest";
import { lambdaHandlerConstructor } from "./asyncBiometricTokenHandler";
import { IAsyncBiometricTokenDependencies } from "./handlerDependencies";
import {
  expectedSecurityHeaders,
  mockSessionId,
  mockInertSessionRegistry,
} from "../testUtils/unitTestData";
import { logger } from "../common/logging/logger";
import {
  emptyFailure,
  emptySuccess,
  errorResult,
  successResult,
} from "../utils/result";
import { UpdateSessionError } from "../common/session/SessionRegistry";
import { BiometricTokenIssued } from "../common/session/updateOperations/BiometricTokenIssued/BiometricTokenIssued";

jest.mock("crypto", () => ({
  ...jest.requireActual("crypto"),
  randomUUID: () => "mock_opaque_id",
}));

describe("Async Biometric Token", () => {
  let dependencies: IAsyncBiometricTokenDependencies;
  let context: Context;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let result: APIGatewayProxyResult;

  const validRequest = buildRequest({
    body: JSON.stringify({
      sessionId: mockSessionId,
      documentType: "NFC_PASSPORT",
    }),
  });

  const mockGetSecretsSuccess = jest.fn().mockResolvedValue(
    successResult({
      mock_secret_path_passport: "mock_submitter_key_passport",
      mock_secret_path_brp: "mock_submitter_key_brp",
      mock_secret_path_dl: "mock_submitter_key_dl",
    }),
  );

  const mockGetBiometricTokenSuccess = jest
    .fn()
    .mockResolvedValue(successResult("mockBiometricToken"));

  const mockSuccessfulSessionRegistry = {
    ...mockInertSessionRegistry,
    updateSession: jest.fn().mockResolvedValue(emptySuccess()),
  };

  beforeEach(() => {
    dependencies = {
      env: {
        BIOMETRIC_SUBMITTER_KEY_SECRET_PATH_PASSPORT:
          "mock_secret_path_passport",
        BIOMETRIC_SUBMITTER_KEY_SECRET_PATH_BRP: "mock_secret_path_brp",
        BIOMETRIC_SUBMITTER_KEY_SECRET_PATH_DL: "mock_secret_path_dl",
        BIOMETRIC_SUBMITTER_KEY_SECRET_CACHE_DURATION_IN_SECONDS: "900",
        READID_BASE_URL: "mockReadIdBaseUrl",
      },
      getSecrets: mockGetSecretsSuccess,
      getBiometricToken: mockGetBiometricTokenSuccess,
      getSessionRegistry: () => mockSuccessfulSessionRegistry,
    };
    context = buildLambdaContext();
    consoleInfoSpy = jest.spyOn(console, "info");
    consoleErrorSpy = jest.spyOn(console, "error");
  });

  describe("On every invocation", () => {
    beforeEach(async () => {
      result = await lambdaHandlerConstructor(
        dependencies,
        validRequest,
        context,
      );
    });
    it("Adds context to log attributes and logs STARTED message", () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_BIOMETRIC_TOKEN_STARTED",
        function_arn: "arn:12345", // example field to verify that context has been added
      });
    });
    it("Clears pre-existing log attributes", async () => {
      logger.appendKeys({ testKey: "testValue" });
      result = await lambdaHandlerConstructor(
        dependencies,
        validRequest,
        context,
      );
      expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
        testKey: "testValue",
      });
    });
  });

  describe("Config validation", () => {
    describe.each([
      ["BIOMETRIC_SUBMITTER_KEY_SECRET_PATH_PASSPORT"],
      ["BIOMETRIC_SUBMITTER_KEY_SECRET_PATH_BRP"],
      ["BIOMETRIC_SUBMITTER_KEY_SECRET_PATH_DL"],
      ["BIOMETRIC_SUBMITTER_KEY_SECRET_CACHE_DURATION_IN_SECONDS"],
      ["READID_BASE_URL"],
    ])("Given %s environment variable is missing", (envVar: string) => {
      beforeEach(async () => {
        delete dependencies.env[envVar];
        result = await lambdaHandlerConstructor(
          dependencies,
          validRequest,
          context,
        );
      });
      it("returns 500 Internal server error", async () => {
        expect(result).toStrictEqual({
          statusCode: 500,
          body: JSON.stringify({
            error: "server_error",
            error_description: "Internal Server Error",
          }),
          headers: expectedSecurityHeaders,
        });
      });
      it("logs INVALID_CONFIG", async () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_BIOMETRIC_TOKEN_INVALID_CONFIG",
          data: {
            missingEnvironmentVariables: [envVar],
          },
        });
      });
    });
  });

  describe("Request body validation", () => {
    describe("Given request body is invalid", () => {
      beforeEach(async () => {
        const request = buildRequest({
          body: JSON.stringify({
            sessionId: mockSessionId,
            documentType: "BUS_PASS",
          }),
        });
        result = await lambdaHandlerConstructor(dependencies, request, context);
      });

      it("Logs the error", async () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_BIOMETRIC_TOKEN_REQUEST_BODY_INVALID",
          errorMessage:
            "documentType in request body is invalid. documentType: BUS_PASS",
        });
      });

      it("Returns 400 Bad Request response", async () => {
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

  describe("When there is an error getting secrets", () => {
    beforeEach(async () => {
      dependencies.getSecrets = jest.fn().mockResolvedValue(emptyFailure());
      result = await lambdaHandlerConstructor(
        dependencies,
        validRequest,
        context,
      );
    });

    it("returns 500 Internal server error", async () => {
      expect(result).toStrictEqual({
        statusCode: 500,
        body: JSON.stringify({
          error: "server_error",
          error_description: "Internal Server Error",
        }),
        headers: expectedSecurityHeaders,
      });
    });
  });

  describe("Given there is an error getting biometric token", () => {
    beforeEach(async () => {
      dependencies.getBiometricToken = jest
        .fn()
        .mockResolvedValue(emptyFailure());
      result = await lambdaHandlerConstructor(
        dependencies,
        validRequest,
        context,
      );
    });

    it("returns 500 Internal server error", async () => {
      expect(result).toStrictEqual({
        statusCode: 500,
        body: JSON.stringify({
          error: "server_error",
          error_description: "Internal Server Error",
        }),
        headers: expectedSecurityHeaders,
      });
    });
  });

  describe("When session update fails", () => {
    describe("When failure is due to client error", () => {
      beforeEach(async () => {
        dependencies.getSessionRegistry = () => ({
          ...mockInertSessionRegistry,
          updateSession: jest
            .fn()
            .mockResolvedValue(
              errorResult(UpdateSessionError.CONDITIONAL_CHECK_FAILURE),
            ),
        });
        result = await lambdaHandlerConstructor(
          dependencies,
          validRequest,
          context,
        );
      });

      it("Returns 401 Unauthorized", () => {
        expect(result).toStrictEqual({
          statusCode: 401,
          body: JSON.stringify({
            error: "invalid_session",
            error_description:
              "User session is not in a valid state for this operation.",
          }),
          headers: expectedSecurityHeaders,
        });
      });
    });

    describe("When failure is due to server error", () => {
      beforeEach(async () => {
        dependencies.getSessionRegistry = () => ({
          ...mockInertSessionRegistry,
          updateSession: jest
            .fn()
            .mockResolvedValue(
              errorResult(UpdateSessionError.INTERNAL_SERVER_ERROR),
            ),
        });
        result = await lambdaHandlerConstructor(
          dependencies,
          validRequest,
          context,
        );
      });

      it("Returns 500 Internal Server Error", () => {
        expect(result).toStrictEqual({
          statusCode: 500,
          body: JSON.stringify({
            error: "server_error",
            error_description: "Internal Server Error",
          }),
          headers: expectedSecurityHeaders,
        });
      });
    });
  });

  describe("Given a valid request is made", () => {
    beforeEach(async () => {
      result = await lambdaHandlerConstructor(
        dependencies,
        validRequest,
        context,
      );
    });

    it("Passes correct arguments to get secrets", () => {
      expect(mockGetSecretsSuccess).toHaveBeenCalledWith({
        secretNames: [
          "mock_secret_path_passport",
          "mock_secret_path_brp",
          "mock_secret_path_dl",
        ],
        cacheDurationInSeconds: 900,
      });
    });

    it("Passes correct arguments to get biometric token", () => {
      expect(mockGetBiometricTokenSuccess).toHaveBeenCalledWith(
        "mockReadIdBaseUrl",
        "mock_submitter_key_passport",
      );
    });

    it("Passes correct arguments to update session", () => {
      expect(mockSuccessfulSessionRegistry.updateSession).toHaveBeenCalledWith(
        mockSessionId,
        new BiometricTokenIssued("NFC_PASSPORT", "mock_opaque_id"),
      );
    });

    it("Logs COMPLETED", async () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_BIOMETRIC_TOKEN_COMPLETED",
      });
    });

    it("Returns 501 Not Implemented response", async () => {
      expect(result).toStrictEqual({
        headers: expectedSecurityHeaders,
        statusCode: 501,
        body: JSON.stringify({ error: "Not Implemented" }),
      });
    });
  });
});
