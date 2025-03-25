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
  notImplementedResponse,
  serverErrorResponse,
} from "../common/lambdaResponses";
import { dependencies } from "../sts-mock/token/handlerDependencies";

export async function lambdaHandlerConstructor(
  _dependencies: ITestSessionsDependencies,
  _event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  setupLogger(context);
  logger.info(LogMessage.TEST_SESSIONS_STARTED);

  const configResult = getTestSessionsConfig(dependencies.env);
  if (configResult.isError) {
    logger.error(LogMessage.TEST_SESSIONS_INVALID_CONFIG, configResult.value);
    return serverErrorResponse;
  }
  return notImplementedResponse;
}

export const lambdaHandler = lambdaHandlerConstructor.bind(
  null,
  runtimeDependencies,
);
