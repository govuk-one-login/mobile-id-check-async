import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { RequestService } from "./requestService/requestService";
import {
  dependencies,
  IAsyncActiveSessionDependencies,
} from "./handlerDependencies";

export async function lambdaHandlerConstructor(
  dependencies: IAsyncActiveSessionDependencies,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const logger = dependencies.logger();

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

  return {
    statusCode: 200,
    body: "Hello, World",
  };
}

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);

const unauthorizedResponse = {
  headers: { "Content-Type": "application/json" },
  statusCode: 401,
  body: JSON.stringify({
    error: "Unauthorized",
    error_description: "Invalid token",
  }),
};
