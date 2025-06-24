import { expect } from "@jest/globals";
import "../../../../../../tests/testUtils/matchers";
import { Result } from "@govuk-one-login/mobile-id-check-biometric-credential";
import { InMemoryJwksCache } from "../JwksCache";
import { GetKeysResponse, JwksCacheDependencies } from "../types";
import {
  emptyFailure,
  errorResult,
  successResult,
} from "../../../../utils/result";
import { NOW_IN_MILLISECONDS } from "../../../../testUtils/unitTestData";

let inMemoryJwksCache: InMemoryJwksCache;
let dependencies: JwksCacheDependencies;
let result: Result<GetKeysResponse, void>;
let consoleErrorSpy: jest.SpyInstance;

describe("InMemoryJwksCache - Errors", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);

    consoleErrorSpy = jest.spyOn(console, "error");

    dependencies = {
      sendRequest: jest.fn(),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("getJwks", () => {
    describe("Given an HTTP network error occurs", () => {
      beforeEach(async () => {
        dependencies.sendRequest = jest
          .fn()
          .mockResolvedValue(
            errorResult({ description: "mock_error_description" }),
          );
        inMemoryJwksCache = new InMemoryJwksCache(dependencies);
        result = await inMemoryJwksCache.getJwks("mock_jwks_uri");
      });

      it("Returns empty failure", () => {
        expect(result).toEqual(emptyFailure());
      });

      it("Logs MOBILE_ASYNC_GET_JWKS_FAILURE with JWKS URI", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_GET_JWKS_FAILURE",
          data: {
            jwksUri: "mock_jwks_uri",
            errorDescription: "mock_error_description",
          },
        });
      });
    });

    describe("Given an error response is returned", () => {
      beforeEach(async () => {
        dependencies.sendRequest = jest.fn().mockResolvedValue(
          errorResult({
            statusCode: 500,
            description: "mock_error_description",
          }),
        );
        inMemoryJwksCache = new InMemoryJwksCache(dependencies);
        result = await inMemoryJwksCache.getJwks("mock_jwks_uri");
      });

      it("Returns empty failure", () => {
        expect(result).toEqual(emptyFailure());
      });

      it("Logs MOBILE_ASYNC_GET_JWKS_FAILURE with JWKS URI", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_GET_JWKS_FAILURE",
          data: {
            jwksUri: "mock_jwks_uri",
            errorDescription: "mock_error_description",
            statusCode: 500,
          },
        });
      });
    });

    describe("Given status code is not 200", () => {
      beforeEach(async () => {
        dependencies.sendRequest = jest.fn().mockResolvedValue(
          successResult({
            statusCode: 201,
          }),
        );
        inMemoryJwksCache = new InMemoryJwksCache(dependencies);
        result = await inMemoryJwksCache.getJwks("mock_jwks_uri");
      });

      it("Returns empty failure", () => {
        expect(result).toEqual(emptyFailure());
      });

      it("Logs MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE with JWKS URI", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE",
          data: {
            jwksUri: "mock_jwks_uri",
          },
        });
      });
    });

    describe("Given response does not contain body", () => {
      beforeEach(async () => {
        dependencies.sendRequest = jest.fn().mockResolvedValue(
          successResult({
            statusCode: 200,
          }),
        );
        inMemoryJwksCache = new InMemoryJwksCache(dependencies);
        result = await inMemoryJwksCache.getJwks("mock_jwks_uri");
      });

      it("Returns empty failure", () => {
        expect(result).toEqual(emptyFailure());
      });

      it("Logs MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE with JWKS URI", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE",
          data: {
            jwksUri: "mock_jwks_uri",
          },
        });
      });
    });

    describe("Given response body is not valid JSON", () => {
      beforeEach(async () => {
        dependencies.sendRequest = jest.fn().mockResolvedValue(
          successResult({
            statusCode: 200,
            body: "invalid_json",
          }),
        );
        inMemoryJwksCache = new InMemoryJwksCache(dependencies);
        result = await inMemoryJwksCache.getJwks("mock_jwks_uri");
      });

      it("Returns empty failure", () => {
        expect(result).toEqual(emptyFailure());
      });

      it("Logs MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE with JWKS URI", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE",
          data: {
            jwksUri: "mock_jwks_uri",
          },
        });
      });
    });

    describe("Given response body does not include keys", () => {
      beforeEach(async () => {
        dependencies.sendRequest = jest.fn().mockResolvedValue(
          successResult({
            statusCode: 200,
            body: JSON.stringify({ invalid: "object" }),
          }),
        );
        inMemoryJwksCache = new InMemoryJwksCache(dependencies);
        result = await inMemoryJwksCache.getJwks("mock_jwks_uri");
      });

      it("Returns empty failure", () => {
        expect(result).toEqual(emptyFailure());
      });

      it("Logs MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE with JWKS URI", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE",
          data: {
            jwksUri: "mock_jwks_uri",
          },
        });
      });
    });

    describe("Given keys are not an array", () => {
      beforeEach(async () => {
        dependencies.sendRequest = jest.fn().mockResolvedValue(
          successResult({
            statusCode: 200,
            body: JSON.stringify({ keys: "invalid_keys" }),
          }),
        );
        inMemoryJwksCache = new InMemoryJwksCache(dependencies);
        result = await inMemoryJwksCache.getJwks("mock_jwks_uri");
      });

      it("Returns empty failure", () => {
        expect(result).toEqual(emptyFailure());
      });

      it("Logs MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE with JWKS URI", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE",
          data: {
            jwksUri: "mock_jwks_uri",
          },
        });
      });
    });

    describe("Given not all keys in array are objects", () => {
      beforeEach(async () => {
        dependencies.sendRequest = jest.fn().mockResolvedValue(
          successResult({
            statusCode: 200,
            body: JSON.stringify({
              keys: [{ valid: "element" }, "invalid_element"],
            }),
          }),
        );
        inMemoryJwksCache = new InMemoryJwksCache(dependencies);
        result = await inMemoryJwksCache.getJwks("mock_jwks_uri");
      });

      it("Returns empty failure", () => {
        expect(result).toEqual(emptyFailure());
      });

      it("Logs MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE with JWKS URI", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE",
          data: {
            jwksUri: "mock_jwks_uri",
          },
        });
      });
    });

    describe("Given a key in the array is null", () => {
      beforeEach(async () => {
        dependencies.sendRequest = jest.fn().mockResolvedValue(
          successResult({
            statusCode: 200,
            body: JSON.stringify({
              keys: [{ valid: "element" }, null],
            }),
          }),
        );
        inMemoryJwksCache = new InMemoryJwksCache(dependencies);
        result = await inMemoryJwksCache.getJwks("mock_jwks_uri");
      });

      it("Returns empty failure", () => {
        expect(result).toEqual(emptyFailure());
      });

      it("Logs MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE with JWKS URI", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE",
          data: {
            jwksUri: "mock_jwks_uri",
          },
        });
      });
    });
  });
});
