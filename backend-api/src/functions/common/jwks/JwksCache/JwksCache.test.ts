import { Result } from "@govuk-one-login/mobile-id-check-biometric-credential";
import { InMemoryJwksCache } from "./JwksCache";
import {
  GetJwksErrorReason,
  GetKeysError,
  GetKeysResponse,
  IGetJwksFromJwksUri,
} from "../types";
import { errorResult, successResult } from "../../../utils/result";
import { NOW_IN_MILLISECONDS } from "../../../testUtils/unitTestData";

let inMemoryJwksCache: InMemoryJwksCache;
let result: Result<GetKeysResponse, GetKeysError>;

let mockSuccessfulGetJwks: IGetJwksFromJwksUri;
let mockFailingGetJwks: IGetJwksFromJwksUri;

const MAXIMUM_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

describe("InMemoryJwksCache", () => {
  beforeEach(() => {
    mockSuccessfulGetJwks = jest.fn().mockResolvedValue(
      successResult({
        keys: [{ kid: "mock_kid" }],
        cacheDurationMillis: MAXIMUM_CACHE_DURATION - 1,
      }),
    );

    mockFailingGetJwks = jest.fn().mockResolvedValue(
      errorResult({
        reason: GetJwksErrorReason.ERROR_INVOKING_JWKS_ENDPOINT,
      }),
    );
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("getJwks", () => {
    describe("Given JWKS cache is empty", () => {
      describe("Given getJwks is called with a JWKS URI", () => {
        beforeEach(async () => {
          inMemoryJwksCache = new InMemoryJwksCache(mockSuccessfulGetJwks);
          result = await inMemoryJwksCache.getJwks("mock_jwks_uri");
        });

        it("Returns success with keys", () => {
          expect(result).toEqual(
            successResult({ keys: [{ kid: "mock_kid" }] }),
          );
        });

        it("Calls getJwksFromJwksUri with JWKS URI", () => {
          expect(mockSuccessfulGetJwks).toHaveBeenCalledTimes(1);
          expect(mockSuccessfulGetJwks).toHaveBeenCalledWith("mock_jwks_uri");
        });
      });
    });

    describe("Given response from JWKS URI has been cached previously", () => {
      beforeEach(async () => {
        inMemoryJwksCache = new InMemoryJwksCache(mockSuccessfulGetJwks);
        await inMemoryJwksCache.getJwks("mock_jwks_uri");
        result = await inMemoryJwksCache.getJwks("mock_jwks_uri");
      });

      it("Returns success with keys", () => {
        expect(result).toEqual(successResult({ keys: [{ kid: "mock_kid" }] }));
      });

      it("Does not make additional call to getJwksFromJwksUri", () => {
        expect(mockSuccessfulGetJwks).toHaveBeenCalledTimes(1);
      });
    });

    describe("Given JWKS cache is not empty but keys from a different JWKS URI are requested", () => {
      beforeEach(async () => {
        mockSuccessfulGetJwks = jest
          .fn()
          .mockResolvedValueOnce(
            successResult({
              keys: [{ kid: "mock_kid" }],
              cacheDurationMillis: MAXIMUM_CACHE_DURATION - 1,
            }),
          )
          .mockResolvedValueOnce(
            successResult({
              keys: [{ kid: "mock_other_kid" }],
              cacheDurationMillis: MAXIMUM_CACHE_DURATION - 1,
            }),
          );
        inMemoryJwksCache = new InMemoryJwksCache(mockSuccessfulGetJwks);
        await inMemoryJwksCache.getJwks("mock_jwks_uri");
        result = await inMemoryJwksCache.getJwks("mock_other_jwks_uri");
      });

      it("Returns success with keys", () => {
        expect(result).toEqual(
          successResult({ keys: [{ kid: "mock_other_kid" }] }),
        );
      });

      it("Calls getJwksFromJwksUri for both JWKS URIs", () => {
        expect(mockSuccessfulGetJwks).toHaveBeenCalledTimes(2);
        expect(mockSuccessfulGetJwks).toHaveBeenCalledWith("mock_jwks_uri");
        expect(mockSuccessfulGetJwks).toHaveBeenNthCalledWith(
          1,
          "mock_jwks_uri",
        );
        expect(mockSuccessfulGetJwks).toHaveBeenNthCalledWith(
          2,
          "mock_other_jwks_uri",
        );
      });
    });

    describe("Given response from JWKS URI was previously stored in cache but has expired", () => {
      describe("Given cache duration returned from JWKS response was less than 5 minutes", () => {
        beforeEach(async () => {
          inMemoryJwksCache = new InMemoryJwksCache(mockSuccessfulGetJwks);
          await inMemoryJwksCache.getJwks("mock_jwks_uri");
          jest.setSystemTime(NOW_IN_MILLISECONDS + MAXIMUM_CACHE_DURATION - 1);
          result = await inMemoryJwksCache.getJwks("mock_jwks_uri");
        });

        it("Returns success with keys", () => {
          expect(result).toEqual(
            successResult({ keys: [{ kid: "mock_kid" }] }),
          );
        });

        it("Makes another call to getJwksFromJwksUri with JWKS URI", () => {
          expect(mockSuccessfulGetJwks).toHaveBeenCalledTimes(2);
          expect(mockSuccessfulGetJwks).toHaveBeenNthCalledWith(
            1,
            "mock_jwks_uri",
          );
          expect(mockSuccessfulGetJwks).toHaveBeenNthCalledWith(
            2,
            "mock_jwks_uri",
          );
        });
      });

      describe("Given cache duration returned from JWKS response was greater than 5 minutes", () => {
        beforeEach(async () => {
          mockSuccessfulGetJwks = jest.fn().mockResolvedValue(
            successResult({
              keys: [{ kid: "mock_kid" }],
              cacheDurationMillis: 2 * MAXIMUM_CACHE_DURATION,
            }),
          );
          inMemoryJwksCache = new InMemoryJwksCache(mockSuccessfulGetJwks);

          await inMemoryJwksCache.getJwks("mock_jwks_uri");
          jest.setSystemTime(NOW_IN_MILLISECONDS + MAXIMUM_CACHE_DURATION);
          await inMemoryJwksCache.getJwks("mock_jwks_uri");
          result = await inMemoryJwksCache.getJwks("mock_jwks_uri");
        });

        it("Returns success with keys", () => {
          expect(result).toEqual(
            successResult({ keys: [{ kid: "mock_kid" }] }),
          );
        });

        it("Makes 2 calls to getJwksFromJwksUri", () => {
          expect(mockSuccessfulGetJwks).toHaveBeenCalledTimes(2);
          expect(mockSuccessfulGetJwks).toHaveBeenNthCalledWith(
            1,
            "mock_jwks_uri",
          );
          expect(mockSuccessfulGetJwks).toHaveBeenNthCalledWith(
            2,
            "mock_jwks_uri",
          );
        });
      });
    });

    describe("Given cache for JWKS URI is valid but key ID provided is not in cached response", () => {
      beforeEach(async () => {
        mockSuccessfulGetJwks = jest
          .fn()
          .mockResolvedValueOnce(
            successResult({
              keys: [{ kid: "mock_kid" }],
              cacheDurationMillis: MAXIMUM_CACHE_DURATION - 1,
            }),
          )
          .mockResolvedValueOnce(
            successResult({
              keys: [{ kid: "mock_other_kid" }],
              cacheDurationMillis: MAXIMUM_CACHE_DURATION - 1,
            }),
          );
        inMemoryJwksCache = new InMemoryJwksCache(mockSuccessfulGetJwks);
        await inMemoryJwksCache.getJwks("mock_jwks_uri");
        result = await inMemoryJwksCache.getJwks(
          "mock_jwks_uri",
          "mock_other_kid",
        );
      });

      it("Returns success with keys", () => {
        expect(result).toEqual(
          successResult({ keys: [{ kid: "mock_other_kid" }] }),
        );
      });

      it("Makes another call to getJwksFromJwksUri with JWKS URI", () => {
        expect(mockSuccessfulGetJwks).toHaveBeenCalledTimes(2);
        expect(mockSuccessfulGetJwks).toHaveBeenNthCalledWith(
          1,
          "mock_jwks_uri",
        );
        expect(mockSuccessfulGetJwks).toHaveBeenNthCalledWith(
          2,
          "mock_jwks_uri",
        );
      });
    });

    describe("Given cache for JWKS URI is valid and key ID provided is present in cached response", () => {
      beforeEach(async () => {
        inMemoryJwksCache = new InMemoryJwksCache(mockSuccessfulGetJwks);
        await inMemoryJwksCache.getJwks("mock_jwks_uri");
        result = await inMemoryJwksCache.getJwks("mock_jwks_uri", "mock_kid");
      });

      it("Returns success with keys", () => {
        expect(result).toEqual(successResult({ keys: [{ kid: "mock_kid" }] }));
      });

      it("Does not make an additional call to getJwksFromJwksUri with JWKS URI", () => {
        expect(mockSuccessfulGetJwks).toHaveBeenCalledTimes(1);
        expect(mockSuccessfulGetJwks).toHaveBeenCalledWith("mock_jwks_uri");
      });
    });

    describe("Given error occurs getting keys from JWKS URI", () => {
      beforeEach(async () => {
        inMemoryJwksCache = new InMemoryJwksCache(mockFailingGetJwks);
        result = await inMemoryJwksCache.getJwks("mock_jwks_uri");
      });

      it("Returns failure with error reason", () => {
        expect(result).toEqual(
          errorResult({
            reason: "Error invoking JWKS endpoint",
          }),
        );
      });

      it("Calls getJwksFromJwksUri with JWKS URI", () => {
        expect(mockFailingGetJwks).toHaveBeenCalledTimes(1);
        expect(mockFailingGetJwks).toHaveBeenCalledWith("mock_jwks_uri");
      });
    });
  });

  describe("getSingletonInstance", () => {
    it("Returns same instance on repeated calls", () => {
      const first = InMemoryJwksCache.getSingletonInstance();
      const second = InMemoryJwksCache.getSingletonInstance();
      expect(first).toBe(second);
    });
  });
});
