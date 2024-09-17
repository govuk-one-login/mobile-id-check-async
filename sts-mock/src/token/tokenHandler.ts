import {APIGatewayProxyEvent, APIGatewayProxyResult, Context} from "aws-lambda";
import { Dependencies, dependencies } from "./handlerDependencies";
import {validateServiceTokenRequestBody} from "./validateServiceTokenRequestBody";
import {ConfigService} from "./configService/configService";

export async function lambdaHandlerConstructor(
  dependencies: Dependencies,
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  const logger = dependencies.logger();
  logger.addContext(context);

  logger.log("STARTED");

  const configResult = new ConfigService().getConfig(dependencies.env);
  if (configResult.isError) {
    logger.log("ENVIRONMENT_VARIABLE_MISSING", {
      errorMessage: configResult.value.errorMessage,
    });
    return errorResponse(
        'server_error',
        "Server Error",
        500,
    )
  }

  const config = configResult.value;

  const result = validateServiceTokenRequestBody(event.body);

  if (result.isError) {
    logger.log("INVALID_REQUEST", {
      errorMessage: result.value.errorMessage,
    });
    return errorResponse(
        'invalid_request',
        result.value.errorMessage,
        400,
    )
  }

  const { sub, scope } = result.value;

  const serviceTokenGenerator = dependencies.serviceTokenGenerator(config);



  logger.log("COMPLETED");

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
      expires_in: 3600,
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
  }
}