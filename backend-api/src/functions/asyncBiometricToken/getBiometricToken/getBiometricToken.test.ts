import { emptyFailure, Result, successResult } from "../../utils/result";
import { getBiometricToken } from "./getBiometricToken";
import { expect } from "@jest/globals";
import "../../testUtils/matchers";
import { ISendHttpRequest } from "../../services/http/sendHttpRequest";

describe("getBiometricToken", () => {
  let result: Result<string, void>;
  let consoleDebugSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let mockSendHttpRequest: ISendHttpRequest;
  const expectedArguments = {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Innovalor-Authorization": "mockSubmitterKey",
    },
    method: "POST",
    url: "https://mockUrl.com/oauth/token?grant_type=client_credentials",
  };

  beforeEach(() => {
    consoleDebugSpy = jest.spyOn(console, "debug");
    consoleErrorSpy = jest.spyOn(console, "error");
  });

  describe("On every call", () => {
    beforeEach(async () => {
      mockSendHttpRequest = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: "mockBody",
        headers: {
          mockHeaderKey: "mockHeaderValue",
        },
      });

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

  describe("Given an error is caught when requesting token", () => {
    beforeEach(async () => {
      mockSendHttpRequest = jest.fn().mockRejectedValue(new Error("mockError"));

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
      expect(mockSendHttpRequest).toBeCalledWith(expectedArguments);
    });
  });

  describe("Given the response is invalid", () => {
    describe("Given response body is undefined", () => {
      beforeEach(async () => {
        mockSendHttpRequest = jest.fn().mockResolvedValue({
          statusCode: 200,
          body: undefined,
          headers: {
            mockHeaderKey: "mockHeaderValue",
          },
        });

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
        expect(mockSendHttpRequest).toBeCalledWith(expectedArguments);
      });
    });

    describe("Given response body cannot be parsed", () => {
      beforeEach(async () => {
        mockSendHttpRequest = jest.fn().mockResolvedValue({
          statusCode: 200,
          body: "Invalid JSON",
          headers: {
            mockHeaderKey: "mockHeaderValue",
          },
        });

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
        expect(mockSendHttpRequest).toBeCalledWith(expectedArguments);
      });
    });
  });

  describe("Given valid request is made", () => {
    beforeEach(async () => {
      mockSendHttpRequest = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({
          access_token: "mockBiometricToken",
          expires_in: 3600,
          token_type: "Bearer",
        }),
        headers: {
          mockHeaderKey: "mockHeaderValue",
        },
      });

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
      expect(mockSendHttpRequest).toBeCalledWith(expectedArguments);
    });
  });
});
