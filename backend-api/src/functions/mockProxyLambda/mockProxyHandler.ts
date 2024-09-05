import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";

import { dependencies, IMockProxyDependencies } from "./handlerDependencies";
import { ConfigService } from "./configService/configService";

export async function lambdaHandlerConstructor(
  dependencies: IMockProxyDependencies,
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  const logger = dependencies.logger();
  logger.addContext(context);

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

  const { resourcePath } = event.requestContext;
  const allowedResourcePaths = ["/async/token", "/async/credential"];

  if (!allowedResourcePaths.includes(resourcePath)) {
    logger.log("UNEXPECTED_RESOURCE_PATH", {
      errorMessage: "Resource path is not one of the permitted values",
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

  const method = event.httpMethod;

  if (method !== "POST") {
    logger.log("UNEXPECTED_RESOURCE_METHOD", {
      errorMessage: "Method is not an accepted value",
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

  const proxyRequestService = dependencies.proxyRequestService();
  const proxyRequestResult = await proxyRequestService.makeProxyRequest({
    backendApiUrl: configResult.value.ASYNC_BACKEND_API_URL,
    body: event.body,
    path: resourcePath,
    headers: event.headers,
    method: method,
  });
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
        error_description: "Server Error",
      }),
    };
  }

  logger.log("COMPLETED");
  return proxyRequestResult.value;
}

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
