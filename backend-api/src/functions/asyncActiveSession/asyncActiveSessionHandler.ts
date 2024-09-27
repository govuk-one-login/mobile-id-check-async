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

  const configResult = new ConfigService().getConfig(dependencies.env); // NOSONAR
  if (configResult.isError) {
    // NOSONAR
    logger.log("ENVIRONMENT_VARIABLE_MISSING", {
      // NOSONAR
      errorMessage: configResult.value.errorMessage, // NOSONAR
    }); // NOSONAR
    return serverError500Response; // NOSONAR
  } // NOSONAR
  const config = configResult.value; // NOSONAR

  const requestService = new RequestService();
  const authorizationHeaderResult = requestService.getAuthorizationHeader(
    event.headers["Authorization"] ?? event.headers["authorization"],
  );
  if (authorizationHeaderResult.isError) {
    logger.log("AUTHENTICATION_HEADER_INVALID", {
      errorMessage: authorizationHeaderResult.value.errorMessage,
    });
    return unauthorizedResponse;
  }

  const jwe = authorizationHeaderResult.value;

  const kmsAdapter = dependencies.kmsAdapter(config.ENCRYPTION_KEY_ARN);
  const tokenService = dependencies.tokenService(kmsAdapter);
  const getSubFromTokenResult = await tokenService.getSubFromToken(
    config.STS_JWKS_ENDPOINT,
    jwe,
  );
  if (getSubFromTokenResult.isError) {
    if (getSubFromTokenResult.value.errorCategory === "CLIENT_ERROR") {
      logger.log("FAILED_TO_GET_SUB_FROM_SERVICE_TOKEN", {
        errorMessage: getSubFromTokenResult.value.errorMessage,
      });
      return badRequestResponse;
    }

    logger.log("INTERNAL_SERVER_ERROR", {
      errorMessage: getSubFromTokenResult.value.errorMessage,
    });
    return serverError500Response;
  }

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

const badRequestResponse: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 400,
  body: JSON.stringify({
    error: "invalid_request",
    error_description: "failed decrypting service token jwt",
  }),
};
