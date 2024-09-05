import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";

import { IMockAsyncTokenDependencies } from "./handlerDependencies";
import { ConfigService } from "./configService/configService";

export async function lambdaHandlerConstructor(
  dependencies: IMockAsyncTokenDependencies,
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  const logger = dependencies.logger();

  const configService = new ConfigService();
  const configResult = configService.getConfig(dependencies.env);
  logger.log("STARTED");
  if (configResult.isError) {
    logger.log("ENVIRONMENT_VARIABLE_MISSING", {
      errorMessage: configResult.value.errorMessage,
    });
    return {
      headers: {
        "Content-Type": "application/json",
      },
      statusCode: 500,
      body: JSON.stringify({
        error: "server_error",
        error_description: "Server Error",
      }),
    };
  }
  logger.addContext(context);

  const proxyRequestService = dependencies.proxyRequestService();
  const proxyRequestResult = await proxyRequestService.makeProxyRequest();
  if (proxyRequestResult.isError) {
    logger.log("PROXY_REQUEST_ERROR", {
      errorMessage: proxyRequestResult.value.errorMessage,
    });

    return {
      headers: {
        "Content-Type": "application/json",
      },
      statusCode: 500,
      body: JSON.stringify({
        error: "server_error",
        error_description: proxyRequestResult.value.errorMessage,
      }),
    };
  }

  logger.log("COMPLETED");
  return proxyRequestResult.value;
}

// export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
