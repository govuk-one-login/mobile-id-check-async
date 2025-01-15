import { emptyFailure, Result, successResult } from "../../utils/result";
import { getBiometricToken } from "./getBiometricToken";
import { expect } from "@jest/globals";
import "../../testUtils/matchers";

describe("getBiometricToken", () => {
  let result: Result<string, void>;
  let consoleDebugSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let mockSendHttpRequest;
  beforeEach(() => {
    consoleDebugSpy = jest.spyOn(console, "debug");
    consoleErrorSpy = jest.spyOn(console, "error");
  });

  describe("On every call", () => {
    beforeEach(async () => {
      async function httpRequestOverrideMockResponse() {
        return {
          statusCode: 200,
          body: "mockBody",
          headers: {
            mockHeaderKey: "mockHeaderValue",
          },
        };
      }

      result = await getBiometricToken(
        "https://mockUrl.com",
        "mockSubmitterKey",
        httpRequestOverrideMockResponse,
      );
    });

    it("Logs network call attempt at debug level", () => {
      expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
        messageCode:
          "MOBILE_ASYNC_BIOMETRIC_TOKEN_GET_BIOMETRIC_TOKEN_FROM_READID_ATTEMPT",
      });
    });
  });

  describe("Given there is an error when requesting biometric access token", () => {
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
    });
  });

  describe("Given the response is invalid", () => {
    describe("Given response body is undefined", () => {
      beforeEach(async () => {
        async function httpRequestOverrideMockBodyUndefined() {
          return {
            statusCode: 200,
            body: undefined,
            headers: {
              mockHeaderKey: "mockHeaderValue",
            },
          };
        }

        result = await getBiometricToken(
          "https://mockUrl.com",
          "mockSubmitterKey",
          httpRequestOverrideMockBodyUndefined,
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
      });
    });

    describe("Given response body cannot be parsed", () => {
      beforeEach(async () => {
        async function httpRequestOverrideMockBodyInvalidJSON() {
          return {
            statusCode: 200,
            body: "Invalid JSON",
            headers: {
              mockHeaderKey: "mockHeaderValue",
            },
          };
        }

        result = await getBiometricToken(
          "https://mockUrl.com",
          "mockSubmitterKey",
          httpRequestOverrideMockBodyInvalidJSON,
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
      });
    });
  });

  describe("Given valid request is made", () => {
    beforeEach(async () => {
      const mockData = JSON.stringify({
        access_token: "mockBiometricToken",
        expires_in: 3600,
        token_type: "Bearer",
      });
      async function sendHttpRequestOverrideMockValidResponse() {
        return {
          statusCode: 200,
          body: mockData,
          headers: {
            mockHeaderKey: "mockHeaderValue",
          },
        };
      }

      result = await getBiometricToken(
        "https://mockUrl.com",
        "mockSubmitterKey",
        sendHttpRequestOverrideMockValidResponse,
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
    });
  });
});
