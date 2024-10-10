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
    return serverError500Response;
  }
  const config = configResult.value;

  const authorizationHeaderResult = new RequestService().getAuthorizationHeader(
    event.headers["Authorization"] ?? event.headers["authorization"],
  );
  if (authorizationHeaderResult.isError) {
    logger.log("AUTHENTICATION_HEADER_INVALID", {
      errorMessage: authorizationHeaderResult.value.errorMessage,
    });
    return unauthorizedResponse;
  }

  const serviceToken = authorizationHeaderResult.value;

  const tokenServiceDependencies = dependencies.tokenServiceDependencies;
  const tokenService = dependencies.tokenService(tokenServiceDependencies);
  const getSubFromTokenResult = await tokenService.getSubFromToken(
    config.STS_JWKS_ENDPOINT,
    config.ENCRYPTION_KEY_ARN,
    serviceToken,
    {
      maxAttempts: 3,
      delayInMillis: 100,
    },
  );
  if (getSubFromTokenResult.isError) {
    if (getSubFromTokenResult.value.errorCategory === "CLIENT_ERROR") {
      logger.log("FAILED_TO_GET_SUB_FROM_SERVICE_TOKEN", {
        errorMessage: getSubFromTokenResult.value.errorMessage,
      });
      return badRequestResponse(getSubFromTokenResult.value.errorMessage);
    }

    logger.log("INTERNAL_SERVER_ERROR", {
      errorMessage: getSubFromTokenResult.value.errorMessage,
    });
    return serverError500Response;
  }

  logger.log("COMPLETED");

  return {
    statusCode: 200,
    body: "Hello, World",
  };
}

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);

const serverError500Response: APIGatewayProxyResult = {
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
    error: "Unauthorized",
    error_description: "Invalid token",
  }),
};

const badRequestResponse = (errorDescription: string) => {
  return {
    headers: { "Content-Type": "application/json" },
    statusCode: 400,
    body: JSON.stringify({
      error: "invalid_request",
      error_description: errorDescription,
    }),
  };
};
