import {
  GetJwksFromJwksUriResponse,
  GetKeysResponse,
  JwksCache,
  JwksCacheDependencies,
} from "./types";
import { getJwksFromJwksUri } from "./getJwksFromJwksUri";
import { Result, successResult } from "../../../utils/result";
import { sendHttpRequest } from "../../../adapters/http/sendHttpRequest";

export class InMemoryJwksCache implements JwksCache {
  private static INSTANCE: JwksCache;
  private readonly maximumCacheDuration = 15 * 60 * 1000; // 15 minutes
  private readonly jwksResponses: {
    [key: string]: JwksCacheEntry;
  } = {};

  public static getSingletonInstance(
    dependencies: JwksCacheDependencies = jwksCacheDependencies,
  ): JwksCache {
    if (!this.INSTANCE) {
      this.INSTANCE = new InMemoryJwksCache(dependencies);
    }
    return this.INSTANCE;
  }

  constructor(private readonly dependencies: JwksCacheDependencies) {}

  async getJwks(
    jwksUri: string,
    keyId?: string,
  ): Promise<Result<GetKeysResponse, void>> {
    const previouslyCachedResponse = this.jwksResponses[jwksUri];
    if (!this.cacheContainsFreshResponse(previouslyCachedResponse, keyId)) {
      const getJwksResult = await getJwksFromJwksUri(
        jwksUri,
        this.dependencies,
      );
      if (getJwksResult.isError) {
        return getJwksResult;
      }

      const jwksResponse = getJwksResult.value;
      if (jwksResponse.cacheDurationMillis > 0)
        this.setJwksResponseInCache(jwksUri, jwksResponse);
      return successResult({
        keys: getJwksResult.value.keys,
      });
    }

    return successResult({
      keys: structuredClone(previouslyCachedResponse.keys),
    });
  }

  private setJwksResponseInCache(
    jwksUri: string,
    jwksResponse: GetJwksFromJwksUriResponse,
  ) {
    this.jwksResponses[jwksUri] = {
      keys: jwksResponse.keys,
      expiry:
        Date.now() +
        Math.min(jwksResponse.cacheDurationMillis, this.maximumCacheDuration),
    };
  }

  private cacheContainsFreshResponse(
    cacheEntry: JwksCacheEntry,
    keyId: string | undefined,
  ): boolean {
    return (
      cacheEntry !== undefined &&
      this.isCacheValid(cacheEntry) &&
      (keyId === undefined || this.cacheContainsKeyId(cacheEntry, keyId))
    );
  }

  private isCacheValid(cacheEntry: JwksCacheEntry): boolean {
    return Date.now() < cacheEntry.expiry;
  }

  private cacheContainsKeyId(
    cacheEntry: JwksCacheEntry,
    keyId: string,
  ): boolean {
    return cacheEntry.keys.some((jwk) => "kid" in jwk && jwk.kid === keyId);
  }
}

const jwksCacheDependencies: JwksCacheDependencies = {
  sendRequest: sendHttpRequest,
};

type JwksCacheEntry = {
  keys: object[];
  expiry: number;
};
