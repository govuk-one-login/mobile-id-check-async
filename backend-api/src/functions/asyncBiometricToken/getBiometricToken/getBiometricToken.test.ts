import {
  emptyFailure,
  errorResult,
  Result,
  successResult,
} from "../../utils/result";
import { getBiometricToken } from "./getBiometricToken";
import { expect } from "@jest/globals";
import "../../../../tests/testUtils/matchers";
import { ISendHttpRequest } from "../../adapters/http/sendHttpRequest";

describe("getBiometricToken", () => {
  let result: Result<string, void>;
  let consoleDebugSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let mockSendHttpRequest: ISendHttpRequest;
  const expectedHttpRequest = {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Innovalor-Authorization": "mockSubmitterKey",
    },
    method: "POST",
    url: "https://mockUrl.com/oauth/token?grant_type=client_credentials",
  };
  const expectedRetryConfig = {
    retryableStatusCodes: [
      429, 500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511,
    ],
  };

  beforeEach(() => {
    consoleDebugSpy = jest.spyOn(console, "debug");
    consoleErrorSpy = jest.spyOn(console, "error");
  });

  describe("On every call", () => {
    beforeEach(async () => {
      mockSendHttpRequest = jest.fn().mockResolvedValue(
        successResult({
          statusCode: 200,
          body: "mockBody",
          headers: {
            mockHeaderKey: "mockHeaderValue",
          },
        }),
      );

      result = await getBiometricToken(
        "https://mockUrl.com",
        "mockSubmitterKey",
        mockSendHttpRequest,
      );
    });

    it("Logs network call attempt at debug level", () => {
      expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
        messageCode:
          "MOBILE_ASYNC_BIOMETRIC_TOKEN_GET_BIOMETRIC_TOKEN_FROM_READID_ATTEMPT",
      });
    });
  });

  describe("Given an errorResult is returned when requesting token", () => {
    beforeEach(async () => {
      mockSendHttpRequest = jest.fn().mockResolvedValue(
        errorResult({
          description: `Unexpected network error - ${new Error("mockError")}`,
        }),
      );
      result = await getBiometricToken(
        "https://mockUrl.com",
        "mockSubmitterKey",
        mockSendHttpRequest,
      );
    });

    it("Logs error", () => {
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        messageCode:
          "MOBILE_ASYNC_BIOMETRIC_TOKEN_GET_BIOMETRIC_TOKEN_FROM_READID_FAILURE",
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

        result = await getBiometricToken(
          "https://mockUrl.com",
          "mockSubmitterKey",
          mockSendHttpRequest,
        );
      });

      it("Logs error", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_BIOMETRIC_TOKEN_GET_BIOMETRIC_TOKEN_FROM_READID_FAILURE",
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

        result = await getBiometricToken(
          "https://mockUrl.com",
          "mockSubmitterKey",
          mockSendHttpRequest,
        );
      });

      it("Logs error", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_BIOMETRIC_TOKEN_GET_BIOMETRIC_TOKEN_FROM_READID_FAILURE",
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
    beforeEach(async () => {
      mockSendHttpRequest = jest.fn().mockResolvedValue(
        successResult({
          statusCode: 200,
          body: JSON.stringify({
            access_token: "mockBiometricToken",
            expires_in: 3600,
            token_type: "Bearer",
          }),
          headers: {
            mockHeaderKey: "mockHeaderValue",
          },
        }),
      );

      result = await getBiometricToken(
        "https://mockUrl.com",
        "mockSubmitterKey",
        mockSendHttpRequest,
      );
    });

    it("Logs success at debug level", () => {
      expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
        messageCode:
          "MOBILE_ASYNC_BIOMETRIC_TOKEN_GET_BIOMETRIC_TOKEN_FROM_READID_SUCCESS",
      });
    });

    it("Returns successResult containing biometric token", () => {
      expect(result).toEqual(successResult("mockBiometricToken"));
      expect(mockSendHttpRequest).toBeCalledWith(
        expectedHttpRequest,
        expectedRetryConfig,
      );
    });
  });
});
