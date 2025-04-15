import {
  emptyFailure,
  errorResult,
  Result,
  successResult,
} from "../../utils/result";
import {
  getBiometricSession,
  BiometricSession,
  isRetryableError,
  getLastError,
} from "./getBiometricSession";
import { expect } from "@jest/globals";
import "../../../../tests/testUtils/matchers";
import { ISendHttpRequest } from "../../adapters/http/sendHttpRequest";

describe("getBiometricSession", () => {
  let result: Result<BiometricSession, void>;
  let consoleDebugSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let mockSendHttpRequest: ISendHttpRequest;
  const mockSessionId = "mockSessionId";

  const expectedHttpRequest = {
    url: "https://mockUrl.com/odata/v1/ODataServlet/Sessions('mockSessionId')",
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
    maxRetries: 3,
    initialDelayMs: 50,
    useExponentialBackoff: true,
    useJitter: true,
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
            id: mockSessionId,
            finish: "DONE",
          }),
          headers: {
            mockHeaderKey: "mockHeaderValue",
          },
        }),
      );

      result = await getBiometricSession(
        "https://mockUrl.com",
        mockSessionId,
        "mockSubmitterKey",
        mockSendHttpRequest,
      );
    });

    it("Logs network call attempt at debug level", () => {
      expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_BIOMETRIC_SESSION_GET_FROM_READID_ATTEMPT",
      });
    });
  });

  describe("Given an errorResult is returned when requesting session", () => {
    beforeEach(async () => {
      mockSendHttpRequest = jest.fn().mockResolvedValue(
        errorResult({
          statusCode: 503,
          message: "Service Unavailable",
        }),
      );
      result = await getBiometricSession(
        "https://mockUrl.com",
        mockSessionId,
        "mockSubmitterKey",
        mockSendHttpRequest,
      );
    });

    it("Logs error", () => {
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_BIOMETRIC_SESSION_GET_FROM_READID_FAILURE",
      });
    });

    it("Returns an empty failure", () => {
      expect(result).toEqual(emptyFailure());
      expect(mockSendHttpRequest).toBeCalledWith(
        expectedHttpRequest,
        expectedRetryConfig,
      );
    });

    it("Tracks the error for later use", () => {
      const error = getLastError();
      expect(error).toEqual({
        statusCode: 503,
        message: "Service Unavailable",
      });
      expect(isRetryableError()).toBe(true);
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
          mockSessionId,
          "mockSubmitterKey",
          mockSendHttpRequest,
        );
      });

      it("Logs error", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_BIOMETRIC_SESSION_GET_FROM_READID_FAILURE",
        });
      });

      it("Returns an empty failure", () => {
        expect(result).toEqual(emptyFailure());
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
          mockSessionId,
          "mockSubmitterKey",
          mockSendHttpRequest,
        );
      });

      it("Logs error", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_BIOMETRIC_SESSION_GET_FROM_READID_FAILURE",
        });
      });

      it("Returns an empty failure", () => {
        expect(result).toEqual(emptyFailure());
        expect(mockSendHttpRequest).toBeCalledWith(
          expectedHttpRequest,
          expectedRetryConfig,
        );
      });
    });
  });

  describe("Given valid request is made", () => {
    const mockSession = {
      id: mockSessionId,
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
        mockSessionId,
        "mockSubmitterKey",
        mockSendHttpRequest,
      );
    });

    it("Logs success at debug level", () => {
      expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_BIOMETRIC_SESSION_GET_FROM_READID_SUCCESS",
      });
    });

    it("Returns successResult containing biometric session", () => {
      expect(result).toEqual(successResult(mockSession));
      expect(mockSendHttpRequest).toBeCalledWith(
        expectedHttpRequest,
        expectedRetryConfig,
      );
    });

    it("Clears any previous error", () => {
      expect(getLastError()).toBeNull();
      expect(isRetryableError()).toBe(false);
    });
  });

  describe("Utility functions", () => {
    describe("isRetryableError", () => {
      it("Returns true for retryable status codes", () => {
        mockSendHttpRequest = jest.fn().mockResolvedValue(
          errorResult({
            statusCode: 503,
            message: "Service Unavailable",
          }),
        );

        getBiometricSession(
          "https://mockUrl.com",
          mockSessionId,
          "mockSubmitterKey",
          mockSendHttpRequest,
        );

        expect(isRetryableError()).toBe(true);
      });

      it("Returns false for non-retryable status codes", () => {
        mockSendHttpRequest = jest.fn().mockResolvedValue(
          errorResult({
            statusCode: 404,
            message: "Not Found",
          }),
        );

        getBiometricSession(
          "https://mockUrl.com",
          mockSessionId,
          "mockSubmitterKey",
          mockSendHttpRequest,
        );

        expect(isRetryableError()).toBe(false);
      });

      it("Returns false when no error is present", () => {
        mockSendHttpRequest = jest.fn().mockResolvedValue(
          successResult({
            statusCode: 200,
            body: JSON.stringify({ id: mockSessionId, finish: "DONE" }),
            headers: {},
          }),
        );

        getBiometricSession(
          "https://mockUrl.com",
          mockSessionId,
          "mockSubmitterKey",
          mockSendHttpRequest,
        );

        expect(isRetryableError()).toBe(false);
      });
    });
  });
});
