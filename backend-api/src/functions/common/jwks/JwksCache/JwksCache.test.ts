import { Result } from "@govuk-one-login/mobile-id-check-biometric-credential";
import { InMemoryJwksCache } from "./JwksCache";
import { GetKeysResponse, JwksCacheDependencies } from "../types";
import {
  emptyFailure,
  errorResult,
  successResult,
  SuccessWithValue,
} from "../../../utils/result";
import { NOW_IN_MILLISECONDS } from "../../../testUtils/unitTestData";
import {
  ISendHttpRequest,
  SuccessfulHttpResponse,
} from "../../../adapters/http/sendHttpRequest";

let inMemoryJwksCache: InMemoryJwksCache;
let dependencies: JwksCacheDependencies;
let result: Result<GetKeysResponse, void>;
let mockSendRequest: jest.Mock<ReturnType<ISendHttpRequest>>;

const MAXIMUM_CACHE_DURATION_SECONDS = 15 * 60; // 15 minutes
const MAXIMUM_CACHE_DURATION_MILLIS = 15 * 60 * 1000;

describe("InMemoryJwksCache", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);

    mockSendRequest = jest
      .fn()
      .mockResolvedValue(
        buildSuccessfulJwksResponseWithKeyIdsAndMaxAge(
          ["mock_kid"],
          MAXIMUM_CACHE_DURATION_SECONDS - 1,
        ),
      );
    dependencies = {
      sendRequest: mockSendRequest,
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("getJwks", () => {
    describe("Given JWKS cache is empty", () => {
      describe("Given getJwks is called with a JWKS URI", () => {
        beforeEach(async () => {
          inMemoryJwksCache = new InMemoryJwksCache(dependencies);
          result = await inMemoryJwksCache.getJwks("mock_jwks_uri");
        });

        it("Returns success with keys", () => {
          expect(result).toEqual(
            successResult({ keys: [{ kid: "mock_kid" }] }),
          );
        });

        it("Calls JWKS URI", () => {
          expectJwksUriToHaveBeenCalledNTimes(
            mockSendRequest,
            "mock_jwks_uri",
            1,
          );
        });
      });
    });

    describe("Given response from JWKS URI has been cached previously", () => {
      beforeEach(async () => {
        inMemoryJwksCache = new InMemoryJwksCache(dependencies);
        await inMemoryJwksCache.getJwks("mock_jwks_uri");
        result = await inMemoryJwksCache.getJwks("mock_jwks_uri");
      });

      it("Returns success with keys", () => {
        expect(result).toEqual(successResult({ keys: [{ kid: "mock_kid" }] }));
      });

      it("Does not make additional call to JWKS URI", () => {
        expectJwksUriToHaveBeenCalledNTimes(
          mockSendRequest,
          "mock_jwks_uri",
          1,
        );
      });
    });

    describe("Given JWKS cache is not empty but keys from a different JWKS URI are requested", () => {
      beforeEach(async () => {
        mockSendRequest = jest
          .fn()
          .mockResolvedValueOnce(
            buildSuccessfulJwksResponseWithKeyIdsAndMaxAge(
              ["mock_kid"],
              MAXIMUM_CACHE_DURATION_SECONDS - 1,
            ),
          )
          .mockResolvedValueOnce(
            buildSuccessfulJwksResponseWithKeyIdsAndMaxAge(
              ["mock_other_kid"],
              MAXIMUM_CACHE_DURATION_SECONDS - 1,
            ),
          );
        dependencies.sendRequest = mockSendRequest;

        inMemoryJwksCache = new InMemoryJwksCache(dependencies);
        await inMemoryJwksCache.getJwks("mock_jwks_uri");
        result = await inMemoryJwksCache.getJwks("mock_other_jwks_uri");
      });

      it("Returns success with keys", () => {
        expect(result).toEqual(
          successResult({ keys: [{ kid: "mock_other_kid" }] }),
        );
      });

      it("Calls both JWKS URIs", () => {
        expectJwksUriToHaveBeenCalledNTimes(
          mockSendRequest,
          "mock_jwks_uri",
          1,
        );
        expectJwksUriToHaveBeenCalledNTimes(
          mockSendRequest,
          "mock_other_jwks_uri",
          1,
        );
      });
    });

    describe("Given response from JWKS URI was previously stored in cache but has expired", () => {
      describe("Given cache duration returned from JWKS response was less than maximum", () => {
        beforeEach(async () => {
          inMemoryJwksCache = new InMemoryJwksCache(dependencies);
          await inMemoryJwksCache.getJwks("mock_jwks_uri");
          jest.setSystemTime(
            NOW_IN_MILLISECONDS + MAXIMUM_CACHE_DURATION_MILLIS - 1,
          );
          result = await inMemoryJwksCache.getJwks("mock_jwks_uri");
        });

        it("Returns success with keys", () => {
          expect(result).toEqual(
            successResult({ keys: [{ kid: "mock_kid" }] }),
          );
        });

        it("Makes another call to JWKS URI", () => {
          expectJwksUriToHaveBeenCalledNTimes(
            mockSendRequest,
            "mock_jwks_uri",
            2,
          );
        });
      });

      describe("Given cache duration returned from JWKS response was greater than maximum", () => {
        beforeEach(async () => {
          mockSendRequest = jest
            .fn()
            .mockResolvedValue(
              buildSuccessfulJwksResponseWithKeyIdsAndMaxAge(
                ["mock_kid"],
                2 * MAXIMUM_CACHE_DURATION_SECONDS,
              ),
            );
          dependencies.sendRequest = mockSendRequest;

          inMemoryJwksCache = new InMemoryJwksCache(dependencies);
          await inMemoryJwksCache.getJwks("mock_jwks_uri");

          jest.setSystemTime(
            NOW_IN_MILLISECONDS + MAXIMUM_CACHE_DURATION_MILLIS,
          );
          await inMemoryJwksCache.getJwks("mock_jwks_uri");
          result = await inMemoryJwksCache.getJwks("mock_jwks_uri");
        });

        it("Returns success with keys", () => {
          expect(result).toEqual(
            successResult({ keys: [{ kid: "mock_kid" }] }),
          );
        });

        it("Makes 2 calls to JWKS URI", () => {
          expectJwksUriToHaveBeenCalledNTimes(
            mockSendRequest,
            "mock_jwks_uri",
            2,
          );
        });
      });
    });

    describe("Given cache for JWKS URI is valid but key ID provided is not in cached response", () => {
      beforeEach(async () => {
        mockSendRequest = jest
          .fn()
          .mockResolvedValueOnce(
            buildSuccessfulJwksResponseWithKeyIdsAndMaxAge(
              ["mock_kid"],
              MAXIMUM_CACHE_DURATION_SECONDS - 1,
            ),
          )
          .mockResolvedValueOnce(
            buildSuccessfulJwksResponseWithKeyIdsAndMaxAge(
              ["mock_other_kid"],
              MAXIMUM_CACHE_DURATION_SECONDS - 1,
            ),
          );
        dependencies.sendRequest = mockSendRequest;

        inMemoryJwksCache = new InMemoryJwksCache(dependencies);
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

      it("Makes another call to JWKS URI", () => {
        expectJwksUriToHaveBeenCalledNTimes(
          mockSendRequest,
          "mock_jwks_uri",
          2,
        );
      });
    });

    describe("Given cache for JWKS URI is valid and key ID provided is present in cached response", () => {
      beforeEach(async () => {
        inMemoryJwksCache = new InMemoryJwksCache(dependencies);
        await inMemoryJwksCache.getJwks("mock_jwks_uri");
        result = await inMemoryJwksCache.getJwks("mock_jwks_uri", "mock_kid");
      });

      it("Returns success with keys", () => {
        expect(result).toEqual(successResult({ keys: [{ kid: "mock_kid" }] }));
      });

      it("Does not make an additional call to JWKS URI", () => {
        expectJwksUriToHaveBeenCalledNTimes(
          mockSendRequest,
          "mock_jwks_uri",
          1,
        );
      });
    });

    describe("Given error occurs getting keys from JWKS URI", () => {
      beforeEach(async () => {
        mockSendRequest = jest.fn().mockResolvedValue(
          errorResult({
            statusCode: 500,
            description: "error",
          }),
        );
        dependencies.sendRequest = mockSendRequest;
        inMemoryJwksCache = new InMemoryJwksCache(dependencies);
        result = await inMemoryJwksCache.getJwks("mock_jwks_uri");
      });

      it("Returns empty failure", () => {
        expect(result).toEqual(emptyFailure());
      });

      it("Calls JWKS URI", () => {
        expectJwksUriToHaveBeenCalledNTimes(
          mockSendRequest,
          "mock_jwks_uri",
          1,
        );
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

function expectJwksUriToHaveBeenCalledNTimes(
  httpRequestMock: jest.Mock<ReturnType<ISendHttpRequest>>,
  jwksUri: string,
  numberOfCalls: number,
): void {
  const matchingCalls = httpRequestMock.mock.calls.filter((call) => {
    return call[0].url === jwksUri && call[0].method === "GET";
  });
  expect(matchingCalls.length).toEqual(numberOfCalls);
}

function buildSuccessfulJwksResponseWithKeyIdsAndMaxAge(
  keyIds: string[],
  maxAgeSeconds: number,
): SuccessWithValue<SuccessfulHttpResponse> {
  return successResult({
    statusCode: 200,
    body: JSON.stringify({
      keys: keyIds.map((keyId) => ({ kid: keyId })),
    }),
    headers: {
      "Cache-Control": `max-age=${maxAgeSeconds}`,
    },
  });
}
