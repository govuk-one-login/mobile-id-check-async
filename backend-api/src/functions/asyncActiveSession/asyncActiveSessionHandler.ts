import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { RequestService } from "./requestService/requestService";
import {
  dependencies,
  IAsyncActiveSessionDependencies,
} from "./handlerDependencies";
import { ConfigService } from "./configService/configService";

export async function lambdaHandlerConstructor(
  dependencies: IAsyncActiveSessionDependencies,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const logger = dependencies.logger();
  logger.log("STARTED");

  const configResult = new ConfigService().getConfig(dependencies.env);
  if (configResult.isError) {
    logger.log("ENVIRONMENT_VARIABLE_MISSING", {
      errorMessage: configResult.value.errorMessage,
    });
    return serverErrorResponse;
  }
  const config = configResult.value;

  const authorizationHeaderResult = new RequestService().getAuthorizationHeader(
    event.headers["Authorization"] ?? event.headers["authorization"],
  );
  if (authorizationHeaderResult.isError) {
    logger.log("INVALID_AUTHENTICATION_HEADER", {
      errorMessage: authorizationHeaderResult.value.errorMessage,
    });
    return unauthorizedResponse;
  }

  const serviceTokenJwe = authorizationHeaderResult.value;

  const decryptResult = await dependencies
    .jweDecrypter(config.ENCRYPTION_KEY_ARN)
    .decrypt(serviceTokenJwe);

  if (decryptResult.isError) {
    logger.log("JWE_DECRYPTION_ERROR", {
      errorMessage: decryptResult.value.errorMessage,
    });
    return badRequestResponse("Failed decrypting service token JWE");
  }

  const serviceTokenJwt = decryptResult.value;

  const tokenService = dependencies.tokenService(config.STS_JWKS_ENDPOINT);
  const validateServiceTokenResult = await tokenService.validateServiceToken(
    serviceTokenJwt,
    {
      aud: "aud",
      iss: "iss",
      scope: "idCheck.activeSession.read",
    },
  );

  if (validateServiceTokenResult.isError) {
    if (validateServiceTokenResult.value.errorCategory === "CLIENT_ERROR") {
      logger.log("SERVICE_TOKEN_VALIDATION_ERROR", {
        errorMessage: validateServiceTokenResult.value.errorMessage,
      });
      return badRequestResponse("Failed to validate service token");
    }

    logger.log("INTERNAL_SERVER_ERROR", {
      errorMessage: validateServiceTokenResult.value.errorMessage,
    });
    return serverErrorResponse;
  }

  const sub = validateServiceTokenResult.value;

  const sessionService = dependencies.sessionService(config.SESSION_TABLE_NAME);
  const getActiveSessionResult = await sessionService.getActiveSession(sub);

  if (getActiveSessionResult.isError) {
    logger.log("INTERNAL_SERVER_ERROR", {
      errorMessage: getActiveSessionResult.value.errorMessage,
    });
    return serverErrorResponse;
  }

  const session = getActiveSessionResult.value;
  if (session === null) {
    return notFoundResponse;
  }

  logger.log("COMPLETED");

  return {
    headers: { "Content-Type": "application/json" },
    statusCode: 200,
    body: JSON.stringify(session),
  };
}

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);

const serverErrorResponse: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 500,
  body: JSON.stringify({
    error: "server_error",
    error_description: "Server Error",
  }),
};

const unauthorizedResponse: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 401,
  body: JSON.stringify({
    error: "unauthorized",
    error_description: "Invalid authorization header",
  }),
};

const badRequestResponse = (
  errorDescription: string,
): APIGatewayProxyResult => {
  return {
    headers: { "Content-Type": "application/json" },
    statusCode: 400,
    body: JSON.stringify({
      error: "invalid_request",
      error_description: errorDescription,
    }),
  };
};

const notFoundResponse: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 404,
  body: JSON.stringify({
    error: "session_not_found",
    error_description: "No active session found for the given sub identifier",
  }),
};
