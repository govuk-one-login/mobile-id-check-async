import "../../../../../../tests/testUtils/matchers";
import { InMemoryJwksCache } from "../JwksCache";
import { GetKeysResponse, JwksCacheDependencies } from "../types";
import {
  emptyFailure,
  errorResult,
  Result,
  successResult,
} from "../../../../utils/result";
import { NOW_IN_MILLISECONDS } from "../../../../testUtils/unitTestData";
import {
  vi,
  expect,
  it,
  describe,
  beforeEach,
  afterEach,
  type MockInstance,
} from "vitest";

let inMemoryJwksCache: InMemoryJwksCache;
let dependencies: JwksCacheDependencies;
let result: Result<GetKeysResponse, void>;
let consoleErrorSpy: MockInstance;

describe("InMemoryJwksCache - Errors", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW_IN_MILLISECONDS);

    consoleErrorSpy = vi.spyOn(console, "error");

    dependencies = {
      sendRequest: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getJwks", () => {
    describe("Given an HTTP network error occurs", () => {
      beforeEach(async () => {
        dependencies.sendRequest = vi
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
        dependencies.sendRequest = vi.fn().mockResolvedValue(
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
        dependencies.sendRequest = vi.fn().mockResolvedValue(
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
        dependencies.sendRequest = vi.fn().mockResolvedValue(
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
        dependencies.sendRequest = vi.fn().mockResolvedValue(
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
        dependencies.sendRequest = vi.fn().mockResolvedValue(
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
        dependencies.sendRequest = vi.fn().mockResolvedValue(
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
        dependencies.sendRequest = vi.fn().mockResolvedValue(
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
        dependencies.sendRequest = vi.fn().mockResolvedValue(
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
