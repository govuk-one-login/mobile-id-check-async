import { expect } from "@jest/globals";
import "../../../../../../tests/testUtils/matchers";
import { Result } from "@govuk-one-login/mobile-id-check-biometric-credential";
import { InMemoryJwksCache } from "../JwksCache";
import { GetKeysResponse, JwksCacheDependencies } from "../types";
import { successResult, SuccessWithValue } from "../../../../utils/result";
import { NOW_IN_MILLISECONDS } from "../../../../testUtils/unitTestData";
import {
  ISendHttpRequest,
  SuccessfulHttpResponse,
} from "../../../../adapters/http/sendHttpRequest";

let inMemoryJwksCache: InMemoryJwksCache;
let dependencies: JwksCacheDependencies;
let result: Result<GetKeysResponse, void>;
let mockSendRequest: jest.Mock<ReturnType<ISendHttpRequest>>;
let consoleDebugSpy: jest.SpyInstance;

const MAXIMUM_CACHE_DURATION_SECONDS = 15 * 60; // 15 minutes
const MAXIMUM_CACHE_DURATION_MILLIS = MAXIMUM_CACHE_DURATION_SECONDS * 1000;

const serverDefinedMaxAgeInSeconds = MAXIMUM_CACHE_DURATION_SECONDS - 1;

describe("InMemoryJwksCache - Caching", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);

    consoleDebugSpy = jest.spyOn(console, "debug");

    mockSendRequest = jest
      .fn()
      .mockResolvedValue(
        buildSuccessfulJwksResponseWithKeyIdsAndMaxAge(
          ["mock_kid"],
          serverDefinedMaxAgeInSeconds,
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
    describe("Given no previous requests to JWKS URI", () => {
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

        it("Logs MOBILE_ASYNC_GET_JWKS_ATTEMPT with JWKS URI", () => {
          expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_GET_JWKS_ATTEMPT",
            data: {
              jwksUri: "mock_jwks_uri",
            },
          });
        });

        it("Logs MOBILE_ASYNC_GET_JWKS_SUCCESS with JWKS URI", async () => {
          expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_GET_JWKS_SUCCESS",
            data: {
              jwksUri: "mock_jwks_uri",
            },
          });
        });
      });
    });

    describe("Given previous response from JWKS URI does not include Cache-Control header", () => {
      beforeEach(async () => {
        mockSendRequest = jest.fn().mockResolvedValue(
          successResult({
            statusCode: 200,
            body: JSON.stringify({
              keys: [{ kid: "mock_kid" }],
            }),
            headers: {},
          }),
        );
        dependencies.sendRequest = mockSendRequest;

        inMemoryJwksCache = new InMemoryJwksCache(dependencies);
        await inMemoryJwksCache.getJwks("mock_jwks_uri");
        result = await inMemoryJwksCache.getJwks("mock_jwks_uri");
      });

      it("Returns success with keys", () => {
        expect(result).toEqual(successResult({ keys: [{ kid: "mock_kid" }] }));
      });

      it("Makes another call to JWKS URI", () => {
        expectJwksUriToHaveBeenCalledNTimes(
          mockSendRequest,
          "mock_jwks_uri",
          2,
        );
      });
    });

    describe("Given the only previous response was from a different JWKS URI", () => {
      beforeEach(async () => {
        mockSendRequest = jest
          .fn()
          .mockResolvedValueOnce(
            buildSuccessfulJwksResponseWithKeyIdsAndMaxAge(
              ["mock_kid"],
              serverDefinedMaxAgeInSeconds,
            ),
          )
          .mockResolvedValueOnce(
            buildSuccessfulJwksResponseWithKeyIdsAndMaxAge(
              ["mock_kid"],
              serverDefinedMaxAgeInSeconds,
            ),
          );
        dependencies.sendRequest = mockSendRequest;

        inMemoryJwksCache = new InMemoryJwksCache(dependencies);
        await inMemoryJwksCache.getJwks("mock_jwks_uri");
        result = await inMemoryJwksCache.getJwks("mock_other_jwks_uri");
      });

      it("Returns success with keys", () => {
        expect(result).toEqual(successResult({ keys: [{ kid: "mock_kid" }] }));
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

    describe("Cache expiry", () => {
      describe("Given server-defined max-age returned from previous response was less than maximum cache duration", () => {
        describe("Given server-defined max-age has elapsed", () => {
          beforeEach(async () => {
            inMemoryJwksCache = new InMemoryJwksCache(dependencies);
            await inMemoryJwksCache.getJwks("mock_jwks_uri");
            jest.setSystemTime(
              NOW_IN_MILLISECONDS + serverDefinedMaxAgeInSeconds * 1000,
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

        describe("Given Age header returned from previous response, and [max age - age] has elapsed", () => {
          beforeEach(async () => {
            mockSendRequest = jest.fn().mockResolvedValue(
              successResult({
                statusCode: 200,
                body: JSON.stringify({
                  keys: [{ kid: "mock_kid" }],
                }),
                headers: {
                  "Cache-Control": `max-age=100`,
                  Age: `50`,
                },
              }),
            );
            dependencies.sendRequest = mockSendRequest;

            inMemoryJwksCache = new InMemoryJwksCache(dependencies);
            await inMemoryJwksCache.getJwks("mock_jwks_uri");
            jest.setSystemTime(NOW_IN_MILLISECONDS + 50000);
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

        describe("Given Age header returned from previous response, and [max age - age] < 0", () => {
          beforeEach(async () => {
            mockSendRequest = jest.fn().mockResolvedValue(
              successResult({
                statusCode: 200,
                body: JSON.stringify({
                  keys: [{ kid: "mock_kid" }],
                }),
                headers: {
                  "Cache-Control": `max-age=100`,
                  Age: `101`,
                },
              }),
            );
            dependencies.sendRequest = mockSendRequest;

            inMemoryJwksCache = new InMemoryJwksCache(dependencies);
            await inMemoryJwksCache.getJwks("mock_jwks_uri");
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
      });

      describe("Given server-defined max-age returned from previous response was greater than maximum cache duration", () => {
        describe("Given maximum cache duration has elapsed", () => {
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
    });

    describe("Given previous response from JWKS URI is fresh but contained a different key ID", () => {
      beforeEach(async () => {
        mockSendRequest = jest
          .fn()
          .mockResolvedValueOnce(
            buildSuccessfulJwksResponseWithKeyIdsAndMaxAge(
              ["mock_kid"],
              serverDefinedMaxAgeInSeconds,
            ),
          )
          .mockResolvedValueOnce(
            buildSuccessfulJwksResponseWithKeyIdsAndMaxAge(
              ["mock_other_kid"],
              serverDefinedMaxAgeInSeconds,
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

    describe("Given previous response from JWKS URI is fresh and contained matching key ID", () => {
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

    describe("Given previous response from JWKS URI is fresh and no key ID is provided", () => {
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
