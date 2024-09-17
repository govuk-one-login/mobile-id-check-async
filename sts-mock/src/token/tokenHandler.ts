import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { Dependencies, dependencies } from "./handlerDependencies";
import { validateServiceTokenRequest } from "./validateServiceTokenRequest";
import { ConfigService } from "./configService/configService";

export async function lambdaHandlerConstructor(
  dependencies: Dependencies,
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

  const config = getConfigResult.value;

  const validateServiceTokenRequestResult = validateServiceTokenRequest(
    event.body,
  );
  if (validateServiceTokenRequestResult.isError) {
    const { errorMessage } = validateServiceTokenRequestResult.value;
    logger.log("INVALID_REQUEST", {
      errorMessage,
    });
    return badRequestError(errorMessage);
  }
  const { subjectId, scope } = validateServiceTokenRequestResult.value;

  const serviceTokenGenerator = dependencies.serviceTokenGenerator(
    config.MOCK_STS_BASE_URL,
    config.KEY_STORAGE_BUCKET,
    subjectId,
    scope,
  );
  const generateServiceTokenResult =
    await serviceTokenGenerator.generateServiceToken();
  if (generateServiceTokenResult.isError) {
    logger.log("INTERNAL_SERVER_ERROR", {
      errorMessage: generateServiceTokenResult.value.errorMessage,
    });
    return serverError();
  }

  logger.log("COMPLETED");

  return {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
    statusCode: 200,
    body: JSON.stringify({
      access_token: generateServiceTokenResult.value,
      token_type: "Bearer",
      expires_in: 180,
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
