import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { ITokenDependencies, dependencies } from "./handlerDependencies";
import { ConfigService } from "./configService/configService";
import { JWTPayload } from "jose";

const SERVICE_TOKEN_TTL_IN_SECS = 180;
const PRIVATE_KEY_FILE_NAME = "private-key.json";

export async function lambdaHandlerConstructor(
  dependencies: ITokenDependencies,
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  const logger = dependencies.logger();
  logger.addContext(context);

  logger.log("STARTED");

  const getConfigResult = new ConfigService().getConfig(dependencies.env);
  if (getConfigResult.isError) {
    logger.log("ENVIRONMENT_VARIABLE_MISSING", {
      errorMessage: getConfigResult.value.errorMessage,
    });
    return serverError();
  }

  const validateServiceTokenRequestResult =
    dependencies.validateServiceTokenRequest(event.body);
  if (validateServiceTokenRequestResult.isError) {
    const { errorMessage } = validateServiceTokenRequestResult.value;
    logger.log("INVALID_REQUEST", {
      errorMessage,
    });
    return badRequestError(errorMessage);
  }

  const config = getConfigResult.value;

  const getKeyResult = await dependencies
    .keyRetriever()
    .getKey(config.KEY_STORAGE_BUCKET_NAME, PRIVATE_KEY_FILE_NAME);
  if (getKeyResult.isError) {
    logger.log("INTERNAL_SERVER_ERROR", {
      errorMessage: getKeyResult.value.errorMessage,
    });
    return serverError();
  }

  const { subjectId, scope } = validateServiceTokenRequestResult.value;
  const payload = getServiceTokenPayload(
    config.MOCK_STS_BASE_URL,
    SERVICE_TOKEN_TTL_IN_SECS,
    subjectId,
    scope,
  );

  const { signingKey, keyId } = getKeyResult.value;
  const signTokenResult = await dependencies
    .tokenSigner()
    .sign(keyId, payload, signingKey);
  if (signTokenResult.isError) {
    logger.log("INTERNAL_SERVER_ERROR", {
      errorMessage: signTokenResult.value.errorMessage,
    });
    return serverError();
  }

  // CREATE NEW CLASS THAT FETCHES PUBLIC ENCRYPTION KEY AND ENCRYPTS SERVICE TOKEN BEFORE RETURNING IT

  logger.log("COMPLETED");

  return {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
    statusCode: 200,
    body: JSON.stringify({
      access_token: signTokenResult.value,
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
  tokenExpiry: number,
  sub: string,
  scope: string,
): JWTPayload {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return {
    aud: "TBC",
    iss: issuer,
    sub: sub,
    iat: nowInSeconds,
    exp: nowInSeconds + tokenExpiry,
    scope: scope,
  };
}
