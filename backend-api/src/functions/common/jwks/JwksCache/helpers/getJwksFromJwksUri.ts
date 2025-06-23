import {
  HttpRequest,
  SuccessfulHttpResponse,
} from "../../../../adapters/http/sendHttpRequest";
import { emptyFailure, Result, successResult } from "../../../../utils/result";
import {
  GetJwksFromJwksUriResponse,
  IGetJwksFromJwksUri,
  JwksCacheDependencies,
} from "../types";
import { logger } from "../../../logging/logger";
import { LogMessage } from "../../../logging/LogMessage";
import { getHeader } from "../../../request/getHeader/getHeader";
import { parseAgeHeader } from "../../../request/parseAgeHeader/parseAgeHeader";
import { parseCacheControlHeader } from "../../../request/parseCacheControlHeader/parseCacheControlHeader";

export const getJwksFromJwksUri: IGetJwksFromJwksUri = async (
  jwksUri: string,
  dependencies: JwksCacheDependencies,
) => {
  logger.debug(LogMessage.GET_JWKS_ATTEMPT, { data: { jwksUri } });

  const jwksRequest: HttpRequest = {
    url: jwksUri,
    method: "GET",
  };
  const jwksResult = await dependencies.sendRequest(jwksRequest);

  if (jwksResult.isError) {
    const { statusCode, description } = jwksResult.value;
    logger.error(LogMessage.GET_JWKS_FAILURE, {
      data: {
        jwksUri,
        errorDescription: description,
        ...(statusCode && { statusCode }),
      },
    });
    return emptyFailure();
  }

  const validationResult = validateResponse(jwksResult.value);
  if (validationResult.isError) {
    logger.error(LogMessage.MALFORMED_JWKS_RESPONSE, { data: { jwksUri } });
    return emptyFailure();
  }

  logger.debug(LogMessage.GET_JWKS_SUCCESS, { data: { jwksUri } });
  return successResult(validationResult.value);
};

function validateResponse(
  response: SuccessfulHttpResponse,
): Result<GetJwksFromJwksUriResponse, void> {
  if (response.statusCode !== 200 || response.body === undefined) {
    return emptyFailure();
  }

  let body: object;
  try {
    body = JSON.parse(response.body);
  } catch {
    return emptyFailure();
  }

  if (!bodyIsValid(body)) return emptyFailure();

  const jwksMaxAgeSeconds = parseCacheControlHeader(
    getHeader(response.headers, "Cache-Control"),
  ).maxAge;

  if (jwksMaxAgeSeconds === 0) {
    return successResult({
      keys: body.keys,
      cacheDurationMillis: 0,
    });
  }

  const jwksAgeSeconds = parseAgeHeader(getHeader(response.headers, "Age"));
  return successResult({
    keys: body.keys,
    cacheDurationMillis: Math.max(
      (jwksMaxAgeSeconds - jwksAgeSeconds) * 1000,
      0,
    ),
  });
}

function bodyIsValid(body: object): body is Record<"keys", object[]> {
  return (
    "keys" in body &&
    Array.isArray(body.keys) &&
    body.keys.every((key) => keyIsValid(key))
  );
}

function keyIsValid(key: unknown): key is object {
  return typeof key === "object" && key !== null;
}
