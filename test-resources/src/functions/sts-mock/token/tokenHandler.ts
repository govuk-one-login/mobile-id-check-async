import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { TokenDependencies, dependencies } from "./handlerDependencies";
import { ConfigService } from "./configService/configService";
import { JWTPayload } from "jose";
import { LogMessage } from "../../common/logging/LogMessage";
import { logger } from "../../common/logging/logger";
import { setupLogger } from "../../common/logging/setupLogger";

const SERVICE_TOKEN_TTL_IN_SECS = 180;
const PRIVATE_KEY_JWK_FILE_NAME = "private-key.json";

export async function lambdaHandlerConstructor(
  dependencies: TokenDependencies,
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  setupLogger(context);
  logger.info(LogMessage.STS_MOCK_STARTED);

  const getConfigResult = new ConfigService().getConfig(dependencies.env);
  if (getConfigResult.isError) {
    logger.error(LogMessage.STS_MOCK_INVALID_CONFIG, {
      errorMessage: getConfigResult.value.errorMessage,
    });
    return serverError();
  }
  const config = getConfigResult.value;

  const validateServiceTokenRequestResult =
    dependencies.validateServiceTokenRequest(event.body);
  if (validateServiceTokenRequestResult.isError) {
    const { errorMessage } = validateServiceTokenRequestResult.value;
    logger.error(LogMessage.STS_MOCK_REQUEST_BODY_INVALID, {
      errorMessage,
    });
    return badRequestError(errorMessage);
  }

  const getKeyResult = await dependencies
    .keyRetriever()
    .getKey(config.KEY_STORAGE_BUCKET_NAME, PRIVATE_KEY_JWK_FILE_NAME);
  if (getKeyResult.isError) {
    logger.error(LogMessage.STS_MOCK_FAILURE_RETRIEVING_SIGNING_KEY, {
      errorMessage: getKeyResult.value.errorMessage,
    });
    return serverError();
  }
  const { signingKey, keyId } = getKeyResult.value;

  const { subjectId, scope } = validateServiceTokenRequestResult.value;

  const payload = getServiceTokenPayload(
    config.STS_MOCK_BASE_URL,
    config.ASYNC_BACKEND_BASE_URL,
    SERVICE_TOKEN_TTL_IN_SECS,
    subjectId,
    scope,
  );

  const signTokenResult = await dependencies
    .tokenSigner()
    .sign(keyId, payload, signingKey);
  if (signTokenResult.isError) {
    logger.error(LogMessage.STS_MOCK_FAILURE_SIGNING_TOKEN, {
      errorMessage: signTokenResult.value.errorMessage,
    });
    return serverError();
  }
  const jwt = signTokenResult.value;

  const protectedServiceJwksUri =
    config.ASYNC_BACKEND_BASE_URL + "/.well-known/jwks.json";
  const tokenEncrypterResult = await dependencies
    .tokenEncrypter(protectedServiceJwksUri)
    .encrypt(jwt);
  if (tokenEncrypterResult.isError) {
    logger.error(LogMessage.STS_MOCK_FAILURE_ENCRYPTING_TOKEN, {
      errorMessage: tokenEncrypterResult.value.errorMessage,
    });
    return serverError();
  }

  const serviceToken = tokenEncrypterResult.value;

  logger.info(LogMessage.STS_MOCK_COMPLETED);

  return {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
    statusCode: 200,
    body: JSON.stringify({
      access_token: serviceToken,
      token_type: "Bearer",
      expires_in: SERVICE_TOKEN_TTL_IN_SECS,
    }),
  };
}

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);

function errorResponse(
  error: string,
  errorDescription: string,
  statusCode: number,
): APIGatewayProxyResult {
  return {
    statusCode,
    body: JSON.stringify({
      error,
      error_description: errorDescription,
    }),
    headers: { "Content-Type": "application/json" },
  };
}

function serverError() {
  return errorResponse("server_error", "Server Error", 500);
}

function badRequestError(errorDescription: string) {
  return errorResponse("invalid_request", errorDescription, 400);
}

function getServiceTokenPayload(
  issuer: string,
  audience: string,
  tokenExpiry: number,
  sub: string,
  scope: string,
): JWTPayload {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return {
    aud: audience,
    iss: issuer,
    sub: sub,
    iat: nowInSeconds,
    exp: nowInSeconds + tokenExpiry,
    scope: scope,
  };
}
