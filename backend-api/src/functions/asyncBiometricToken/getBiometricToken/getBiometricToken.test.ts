import { emptyFailure, Result, successResult } from "../../utils/result";
import { getBiometricToken } from "./getBiometricToken";
import { expect } from "@jest/globals";
import "../../testUtils/matchers";

describe("getBiometricToken", () => {
  let result: Result<string, void>;
  let consoleDebugSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  beforeEach(() => {
    consoleDebugSpy = jest.spyOn(console, "debug");
    consoleErrorSpy = jest.spyOn(console, "error");
  });

  describe("On every call", () => {
    beforeEach(async () => {
      global.fetch = jest.fn(() => Promise.resolve()) as jest.Mock;

      result = await getBiometricToken(
        "https://mockUrl.com",
        "mockSubmitterKey",
      );
    });

    it("Logs network call attempt at debug level", () => {
      expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
        messageCode:
          "MOBILE_ASYNC_BIOMETRIC_TOKEN_GET_BIOMETRIC_TOKEN_FROM_READID_ATTEMPT",
      });
    });
  });

  describe("Given there is an error making network request", () => {
    beforeEach(async () => {
      global.fetch = jest.fn(() =>
        Promise.reject(new Error("Unexpected network error")),
      ) as jest.Mock;

      result = await getBiometricToken(
        "https://mockUrl.com",
        "mockSubmitterKey",
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
        global.fetch = jest.fn(() =>
          Promise.resolve({
            status: 200,
            ok: true,
            headers: new Headers({ "Content-Type": "text/plain" }),
            text: () => Promise.resolve(null),
          } as unknown as Response),
        ) as jest.Mock;

        result = await getBiometricToken(
          "https://mockUrl.com",
          "mockSubmitterKey",
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
        global.fetch = jest.fn(() =>
          Promise.resolve({
            status: 200,
            ok: true,
            headers: new Headers({ "Content-Type": "text/plain" }),
            text: () => Promise.resolve("Invalid JSON"),
          } as Response),
        ) as jest.Mock;

        result = await getBiometricToken(
          "https://mockUrl.com",
          "mockSubmitterKey",
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
      global.fetch = jest.fn(() =>
        Promise.resolve({
          status: 200,
          ok: true,
          headers: new Headers({ "Content-Type": "text/plain" }),
          text: () => Promise.resolve(mockData),
        } as Response),
      ) as jest.Mock;

      result = await getBiometricToken(
        "https://mockUrl.com",
        "mockSubmitterKey",
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
