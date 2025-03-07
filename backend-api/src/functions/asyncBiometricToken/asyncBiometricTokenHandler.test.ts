import { expect } from "@jest/globals";
import "../../../tests/testUtils/matchers";
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
  mockInertEventService,
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

  const validSessionAttributes = {
    clientId: "mockClientId",
    govukSigninJourneyId: "mockGovukSigninJourneyId",
    createdAt: 12345,
    issuer: "mockIssuer",
    sessionId: mockSessionId,
    sessionState: "mockSessionState",
    clientState: "mockClientState",
    subjectIdentifier: "mockSubjectIdentifier",
    timeToLive: 12345,
    documentType: "NFC_PASSPORT",
    opaqueId: "mockOpaqueId",
    redirectUri: "https://www.mockRedirectUri.com",
  };

  const mockSuccessfulSessionRegistry = {
    ...mockInertSessionRegistry,
    updateSession: jest
      .fn()
      .mockResolvedValue(successResult({ attributes: validSessionAttributes })),
  };

  const mockWriteGenericEventSuccessResult = jest
    .fn()
    .mockResolvedValue(emptySuccess());

  const mockWriteBiometricTokenIssuedEventSuccessResult = jest
    .fn()
    .mockResolvedValue(emptySuccess());

  const mockSuccessfulEventService = {
    ...mockInertEventService,
    writeGenericEvent: mockWriteGenericEventSuccessResult,
    writeBiometricTokenIssuedEvent:
      mockWriteBiometricTokenIssuedEventSuccessResult,
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
        SESSION_TABLE_NAME: "mockTableName",
        TXMA_SQS: "mockTxmaSqs",
        ISSUER: "mockIssuer",
      },
      getSecrets: mockGetSecretsSuccess,
      getBiometricToken: mockGetBiometricTokenSuccess,
      getSessionRegistry: () => mockSuccessfulSessionRegistry,
      getEventService: () => mockSuccessfulEventService,
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
    it("Adds context and version to log attributes and logs STARTED message", () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_BIOMETRIC_TOKEN_STARTED",
        functionVersion: "1",
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
      ["SESSION_TABLE_NAME"],
      ["TXMA_SQS"],
      ["ISSUER"],
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

    describe("Given DCMAW_ASYNC_CRI_5XXERROR event fails to write to TxMA", () => {
      beforeEach(async () => {
        dependencies.getEventService = () => ({
          ...mockInertEventService,
          writeGenericEvent: jest.fn().mockResolvedValue(
            errorResult({
              errorMessage: "mockError",
            }),
          ),
        });

        result = await lambdaHandlerConstructor(
          dependencies,
          validRequest,
          context,
        );
      });

      it("Logs the error", async () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_ERROR_WRITING_AUDIT_EVENT",
          data: {
            auditEventName: "DCMAW_ASYNC_CRI_5XXERROR",
          },
        });
      });

      it("Returns 500 Internal server error", async () => {
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

    describe("Given DCMAW_ASYNC_CRI_5XXERROR event successfully to write to TxMA", () => {
      it("Writes DCMAW_ASYNC_CRI_5XXERROR event to TxMA", () => {
        expect(mockWriteGenericEventSuccessResult).toBeCalledWith({
          eventName: "DCMAW_ASYNC_CRI_5XXERROR",
          componentId: "mockIssuer",
          getNowInMilliseconds: Date.now,
          govukSigninJourneyId: undefined,
          sessionId: mockSessionId,
          sub: undefined,
          ipAddress: "1.1.1.1",
          txmaAuditEncoded: "mockTxmaAuditEncodedHeader",
        });
      });

      it("Returns 500 Internal server error", async () => {
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

  describe("When session update fails", () => {
    describe("When failure is due to client error", () => {
      describe("Given session was not found", () => {
        beforeEach(async () => {
          dependencies.getSessionRegistry = () => ({
            ...mockInertSessionRegistry,
            updateSession: jest.fn().mockResolvedValue(
              errorResult({
                errorType: UpdateSessionError.SESSION_NOT_FOUND,
              }),
            ),
          });
          result = await lambdaHandlerConstructor(
            dependencies,
            validRequest,
            context,
          );
        });

        describe("Given DCMAW_ASYNC_CRI_4XXERROR event fails to write to TxMA", () => {
          beforeEach(async () => {
            dependencies.getEventService = () => ({
              ...mockInertEventService,
              writeGenericEvent: jest.fn().mockResolvedValue(
                errorResult({
                  errorMessage: "mockError",
                }),
              ),
            });

            result = await lambdaHandlerConstructor(
              dependencies,
              validRequest,
              context,
            );
          });
          it("Logs the error", async () => {
            expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
              messageCode: "MOBILE_ASYNC_ERROR_WRITING_AUDIT_EVENT",
              data: {
                auditEventName: "DCMAW_ASYNC_CRI_4XXERROR",
              },
            });
          });

          it("Returns 500 Internal Server Error ", async () => {
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

        it("Writes DCMAW_ASYNC_CRI_4XXERROR event to TxMA", () => {
          expect(mockWriteGenericEventSuccessResult).toBeCalledWith({
            eventName: "DCMAW_ASYNC_CRI_4XXERROR",
            componentId: "mockIssuer",
            getNowInMilliseconds: Date.now,
            govukSigninJourneyId: undefined,
            sessionId: mockSessionId,
            sub: undefined,
            ipAddress: "1.1.1.1",
            txmaAuditEncoded: "mockTxmaAuditEncodedHeader",
          });
        });

        it("Returns 401 Unauthorized", () => {
          expect(result).toStrictEqual({
            statusCode: 401,
            body: JSON.stringify({
              error: "invalid_session",
              error_description: "Session not found",
            }),
            headers: expectedSecurityHeaders,
          });
        });
      });

      describe("Given session was found", () => {
        beforeEach(async () => {
          dependencies.getSessionRegistry = () => ({
            ...mockInertSessionRegistry,
            updateSession: jest.fn().mockResolvedValue(
              errorResult({
                errorType: UpdateSessionError.CONDITIONAL_CHECK_FAILURE,
                attributes: validSessionAttributes,
              }),
            ),
          });
          result = await lambdaHandlerConstructor(
            dependencies,
            validRequest,
            context,
          );
        });

        describe("Given DCMAW_ASYNC_CRI_4XXERROR event fails to write to TxMA", () => {
          beforeEach(async () => {
            dependencies.getEventService = () => ({
              ...mockInertEventService,
              writeGenericEvent: jest.fn().mockResolvedValue(
                errorResult({
                  errorMessage: "mockError",
                }),
              ),
            });

            result = await lambdaHandlerConstructor(
              dependencies,
              validRequest,
              context,
            );
          });

          it("Logs the error", async () => {
            expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
              messageCode: "MOBILE_ASYNC_ERROR_WRITING_AUDIT_EVENT",
              data: {
                auditEventName: "DCMAW_ASYNC_CRI_4XXERROR",
              },
            });
          });

          it("Returns 500 Internal Server Error ", async () => {
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

        it("Writes DCMAW_ASYNC_CRI_4XXERROR event to TxMA", () => {
          expect(mockWriteGenericEventSuccessResult).toBeCalledWith({
            eventName: "DCMAW_ASYNC_CRI_4XXERROR",
            componentId: "mockIssuer",
            getNowInMilliseconds: Date.now,
            govukSigninJourneyId: "mockGovukSigninJourneyId",
            sessionId: mockSessionId,
            sub: "mockSubjectIdentifier",
            ipAddress: "1.1.1.1",
            txmaAuditEncoded: "mockTxmaAuditEncodedHeader",
            redirect_uri: "https://www.mockRedirectUri.com",
            suspected_fraud_signal: undefined,
          });
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
    });

    describe("When failure is due to server error", () => {
      beforeEach(async () => {
        dependencies.getSessionRegistry = () => ({
          ...mockInertSessionRegistry,
          updateSession: jest.fn().mockResolvedValue(
            errorResult({
              errorType: UpdateSessionError.INTERNAL_SERVER_ERROR,
            }),
          ),
        });
        result = await lambdaHandlerConstructor(
          dependencies,
          validRequest,
          context,
        );
      });

      describe("Given DCMAW_ASYNC_CRI_5XXERROR event fails to write to TxMA", () => {
        beforeEach(async () => {
          dependencies.getEventService = () => ({
            ...mockInertEventService,
            writeGenericEvent: jest.fn().mockResolvedValue(
              errorResult({
                errorMessage: "mockError",
              }),
            ),
          });

          result = await lambdaHandlerConstructor(
            dependencies,
            validRequest,
            context,
          );
        });

        it("Logs the error", async () => {
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_ERROR_WRITING_AUDIT_EVENT",
            data: {
              auditEventName: "DCMAW_ASYNC_CRI_5XXERROR",
            },
          });
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

      describe("Given DCMAW_ASYNC_CRI_5XXERROR event successfully to write to TxMA", () => {
        it("Writes DCMAW_ASYNC_CRI_5XXERROR event to TxMA", () => {
          expect(mockWriteGenericEventSuccessResult).toBeCalledWith({
            eventName: "DCMAW_ASYNC_CRI_5XXERROR",
            componentId: "mockIssuer",
            getNowInMilliseconds: Date.now,
            govukSigninJourneyId: undefined,
            sessionId: mockSessionId,
            sub: undefined,
            ipAddress: "1.1.1.1",
            txmaAuditEncoded: "mockTxmaAuditEncodedHeader",
          });
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

    describe("Given DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED event fails to write to TxMA", () => {
      beforeEach(async () => {
        dependencies.getEventService = () => ({
          ...mockInertEventService,
          writeBiometricTokenIssuedEvent: jest.fn().mockResolvedValue(
            errorResult({
              errorMessage: "mockError",
            }),
          ),
        });

        result = await lambdaHandlerConstructor(
          dependencies,
          validRequest,
          context,
        );
      });
      it("Logs the error", async () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_ERROR_WRITING_AUDIT_EVENT",
          data: {
            auditEventName: "DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED", // example field to verify that context has been added
          },
        });
      });

      it("Returns 500 Internal Server Error ", async () => {
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

    describe("Given DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED event successfully writes to TxMA", () => {
      it("Writes DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED event to TxMA", () => {
        expect(mockWriteBiometricTokenIssuedEventSuccessResult).toBeCalledWith({
          componentId: "mockIssuer",
          getNowInMilliseconds: Date.now,
          govukSigninJourneyId: "mockGovukSigninJourneyId",
          sessionId: mockSessionId,
          sub: "mockSubjectIdentifier",
          documentType: "NFC_PASSPORT",
          ipAddress: "1.1.1.1",
          txmaAuditEncoded: "mockTxmaAuditEncodedHeader",
          redirect_uri: "https://www.mockRedirectUri.com",
        });
      });

      it("Logs COMPLETED", async () => {
        expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_BIOMETRIC_TOKEN_COMPLETED",
        });
      });

      it("Returns 200 response with biometric access token and opaque ID", async () => {
        expect(result).toStrictEqual({
          headers: expectedSecurityHeaders,
          statusCode: 200,
          body: JSON.stringify({
            accessToken: "mockBiometricToken",
            opaqueId: "mock_opaque_id",
          }),
        });
      });
    });
  });
});
