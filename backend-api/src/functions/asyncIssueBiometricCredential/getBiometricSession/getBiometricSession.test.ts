import { errorResult, Result, successResult } from "../../utils/result";
import {
  getBiometricSession,
  BiometricSession,
  GetBiometricSessionError,
} from "./getBiometricSession";
import { expect } from "@jest/globals";
import "../../../../tests/testUtils/matchers";
import { ISendHttpRequest } from "../../adapters/http/sendHttpRequest";

describe("getBiometricSession", () => {
  let result: Result<BiometricSession, GetBiometricSessionError>;
  let consoleDebugSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let mockSendHttpRequest: ISendHttpRequest;
  const mockBiometricSessionId = "mockBiometricSessionId";

  const expectedHttpRequest = {
    url: "https://mockUrl.com/odata/v1/ODataServlet/Sessions('mockBiometricSessionId')",
    method: "GET",
    headers: {
      "X-Innovalor-Authorization": "mockSubmitterKey",
      Accept: "application/json;odata.metadata=minimal",
      "Content-Type": "application/json;odata.metadata=minimal",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    },
  };

  const expectedRetryConfig = {
    retryableStatusCodes: [
      429, 500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511,
    ],
    delayInMillis: 50,
  };

  beforeEach(() => {
    consoleDebugSpy = jest.spyOn(console, "debug");
    consoleErrorSpy = jest.spyOn(console, "error");

    jest.resetModules();
  });

  describe("On every call", () => {
    beforeEach(async () => {
      mockSendHttpRequest = jest.fn().mockResolvedValue(
        successResult({
          statusCode: 200,
          body: JSON.stringify({
            finish: "DONE",
          }),
          headers: {
            mockHeaderKey: "mockHeaderValue",
          },
        }),
      );

      result = await getBiometricSession(
        "https://mockUrl.com",
        mockBiometricSessionId,
        "mockSubmitterKey",
        mockSendHttpRequest,
      );
    });

    it("Logs network call attempt at debug level", () => {
      expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
        messageCode:
          "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_GET_FROM_READID_ATTEMPT",
      });
    });
  });

  describe("Given an error is returned when requesting session", () => {
    describe("Given a retryable error (5XX)", () => {
      beforeEach(async () => {
        mockSendHttpRequest = jest.fn().mockResolvedValue(
          errorResult({
            statusCode: 503,
            message: "Service Unavailable",
          }),
        );
        result = await getBiometricSession(
          "https://mockUrl.com",
          mockBiometricSessionId,
          "mockSubmitterKey",
          mockSendHttpRequest,
        );
      });

      it("Logs error", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_GET_FROM_READID_FAILURE",
        });
      });

      it("Returns an error result with retryable flag", () => {
        expect(result.isError).toBe(true);
        expect(result.value).toEqual({
          isRetryable: true,
        });
        expect(mockSendHttpRequest).toBeCalledWith(
          expectedHttpRequest,
          expectedRetryConfig,
        );
      });
    });

    describe("Given a non-retryable error (4XX)", () => {
      beforeEach(async () => {
        mockSendHttpRequest = jest.fn().mockResolvedValue(
          errorResult({
            statusCode: 404,
            message: "Not Found",
          }),
        );
        result = await getBiometricSession(
          "https://mockUrl.com",
          mockBiometricSessionId,
          "mockSubmitterKey",
          mockSendHttpRequest,
        );
      });

      it("Logs error", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_GET_FROM_READID_FAILURE",
        });
      });

      it("Returns an error result with non-retryable flag", () => {
        expect(result.isError).toBe(true);
        expect(result.value).toEqual({
          isRetryable: false,
        });
        expect(mockSendHttpRequest).toBeCalledWith(
          expectedHttpRequest,
          expectedRetryConfig,
        );
      });
    });

    describe("Given a network error (no status code)", () => {
      beforeEach(async () => {
        mockSendHttpRequest = jest.fn().mockResolvedValue(
          errorResult({
            message: "Network Error",
          }),
        );
        result = await getBiometricSession(
          "https://mockUrl.com",
          mockBiometricSessionId,
          "mockSubmitterKey",
          mockSendHttpRequest,
        );
      });

      it("Treats it as retryable", () => {
        expect(result.isError).toBe(true);
        expect(result.value).toEqual({
          isRetryable: true,
        });
      });
    });
  });

  describe("Given the response is invalid", () => {
    describe("Given response body is undefined", () => {
      beforeEach(async () => {
        mockSendHttpRequest = jest.fn().mockResolvedValue(
          successResult({
            statusCode: 200,
            body: undefined,
            headers: {
              mockHeaderKey: "mockHeaderValue",
            },
          }),
        );

        result = await getBiometricSession(
          "https://mockUrl.com",
          mockBiometricSessionId,
          "mockSubmitterKey",
          mockSendHttpRequest,
        );
      });

      it("Logs error", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_GET_FROM_READID_FAILURE",
        });
      });

      it("Returns an error result with retryable flag", () => {
        expect(result.isError).toBe(true);
        expect(result.value).toEqual({
          isRetryable: false,
        });
        expect(mockSendHttpRequest).toBeCalledWith(
          expectedHttpRequest,
          expectedRetryConfig,
        );
      });
    });

    describe("Given response body cannot be parsed", () => {
      beforeEach(async () => {
        mockSendHttpRequest = jest.fn().mockResolvedValue(
          successResult({
            statusCode: 200,
            body: "Invalid JSON",
            headers: {
              mockHeaderKey: "mockHeaderValue",
            },
          }),
        );

        result = await getBiometricSession(
          "https://mockUrl.com",
          mockBiometricSessionId,
          "mockSubmitterKey",
          mockSendHttpRequest,
        );
      });

      it("Logs error", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_GET_FROM_READID_FAILURE",
        });
      });

      it("Returns an error result with retryable flag set to false", () => {
        expect(result.isError).toBe(true);
        expect(result.value).toEqual({
          isRetryable: false,
        });
        expect(mockSendHttpRequest).toBeCalledWith(
          expectedHttpRequest,
          expectedRetryConfig,
        );
      });
    });

    describe("Given response has invalid structure", () => {
      beforeEach(async () => {
        mockSendHttpRequest = jest.fn().mockResolvedValue(
          successResult({
            statusCode: 200,
            body: JSON.stringify({
              status: "COMPLETE",
            }),
            headers: {
              mockHeaderKey: "mockHeaderValue",
            },
          }),
        );

        result = await getBiometricSession(
          "https://mockUrl.com",
          mockBiometricSessionId,
          "mockSubmitterKey",
          mockSendHttpRequest,
        );
      });

      it("Logs error", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_GET_FROM_READID_FAILURE",
        });
      });

      it("Returns an error result with non-retryable flag", () => {
        expect(result.isError).toBe(true);
        expect(result.value).toEqual({
          isRetryable: false,
        });
      });
    });
  });

  describe("Given valid request is made", () => {
    const mockSession = {
      id: mockBiometricSessionId,
      finish: "DONE",
    };

    beforeEach(async () => {
      mockSendHttpRequest = jest.fn().mockResolvedValue(
        successResult({
          statusCode: 200,
          body: JSON.stringify(mockSession),
          headers: {
            mockHeaderKey: "mockHeaderValue",
          },
        }),
      );

      result = await getBiometricSession(
        "https://mockUrl.com",
        mockBiometricSessionId,
        "mockSubmitterKey",
        mockSendHttpRequest,
      );
    });

    it("Logs success at debug level", () => {
      expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
        messageCode:
          "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_GET_FROM_READID_SUCCESS",
      });
    });

    it("Returns successResult containing biometric session", () => {
      expect(result).toEqual(successResult(mockSession));
      expect(mockSendHttpRequest).toBeCalledWith(
        expectedHttpRequest,
        expectedRetryConfig,
      );
    });
  });
});
