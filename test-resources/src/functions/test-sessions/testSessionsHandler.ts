import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import {
  ITestSessionsDependencies,
  runtimeDependencies,
} from "./handlerDependencies";
import { setupLogger } from "../common/logging/setupLogger";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { getTestSessionsConfig } from "./testSessionsHandlerConfig";
import {
  badRequestResponse,
  notImplementedResponse,
  serverErrorResponse,
} from "../common/lambdaResponses";

export async function lambdaHandlerConstructor(
  dependencies: ITestSessionsDependencies,
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  setupLogger(context);
  logger.info(LogMessage.TEST_SESSIONS_STARTED);
  const configResult = getTestSessionsConfig(dependencies.env);
  if (configResult.isError) {
    logger.error(LogMessage.TEST_SESSIONS_INVALID_CONFIG, configResult.value);
    return serverErrorResponse;
  }

  if (!event.pathParameters?.sessionId) {
    logger.error(LogMessage.TEST_SESSIONS_REQUEST_PATH_PARAM_INVALID, {
      pathParameters: event.pathParameters,
    });

    return badRequestResponse(
      "invalid_request",
      "missing sessionId path parameter",
    );
  }

  logger.info(LogMessage.TEST_SESSIONS_COMPLETED);
  return notImplementedResponse;
}

export const lambdaHandler = lambdaHandlerConstructor.bind(
  null,
  runtimeDependencies,
);
