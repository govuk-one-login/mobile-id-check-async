import {
  APIGatewayProxyEvent,
  APIGatewayProxyEventHeaders,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";

import { dependencies, IMockProxyDependencies } from "./handlerDependencies";
import { ConfigService } from "./configService/configService";

export type StandardisedHeaders = {
  [key in string]: string | number | boolean;
};

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
    return internalServerErrorResponse;
  }

  const { path } = event;
  const allowedPaths = ["/async/token", "/async/credential"];

  if (!allowedPaths.includes(path)) {
    logger.log("UNEXPECTED_PATH", {
      errorMessage: "Path is not one of the permitted values",
    });
    return internalServerErrorResponse;
  }

  const method = event.httpMethod;

  if (method !== "POST") {
    logger.log("UNEXPECTED_HTTP_METHOD", {
      errorMessage: "API method is not POST",
    });
    return internalServerErrorResponse;
  }

  const incomingHeaders = event.headers;
  const standardisedHeaders = standardiseAndStripApiGwHeaders(incomingHeaders);

  const customAuthHeaderValue =
    standardisedHeaders["X-Custom-Auth"] ??
    standardisedHeaders["x-custom-auth"];

  if (customAuthHeaderValue) {
    standardisedHeaders["Authorization"] = customAuthHeaderValue;
  }

  const proxyRequestService = dependencies.proxyRequestService();
  const proxyRequestResult = await proxyRequestService.makeProxyRequest({
    backendApiUrl: configResult.value.PRIVATE_API_URL,
    body: event.body,
    path,
    headers: standardisedHeaders,
    method,
  });
  if (proxyRequestResult.isError) {
    logger.log("PROXY_REQUEST_ERROR", {
      errorMessage: proxyRequestResult.value.errorMessage,
    });

    return internalServerErrorResponse;
  }

  logger.log("COMPLETED");
  return proxyRequestResult.value;
}

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);

const standardiseAndStripApiGwHeaders = (
  apiGwHeaders: APIGatewayProxyEventHeaders,
): StandardisedHeaders => {
  const standardisedHeaders: StandardisedHeaders = {};
  if (!apiGwHeaders) return standardisedHeaders;
  const apiGwHeaderKeys = Object.keys(apiGwHeaders);
  apiGwHeaderKeys.forEach((headerKey) => {
    const headerValue = apiGwHeaders[headerKey];
    if (
      typeof headerValue === "string" ||
      typeof headerValue === "number" ||
      typeof headerValue === "boolean"
    ) {
      // This header is sent by the proxy API and should not be included in downstream network requests.
      // The presence of the header causes TLS Certificate failures as the target of the request is not a domain registered on the certificate.

      if (headerKey !== "Host") {
        standardisedHeaders[headerKey] = headerValue;
      }
    }
  });

  return standardisedHeaders;
};

const internalServerErrorResponse = {
  headers: {
    "Content-Type": "application/json",
  },
  statusCode: 500,
  body: JSON.stringify({
    error: "server_error",
    error_description: "Server Error",
  }),
};
