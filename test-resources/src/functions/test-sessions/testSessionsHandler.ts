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
  okResponse,
  serverErrorResponse,
} from "../common/lambdaResponses";

export async function lambdaHandlerConstructor(
  _dependencies: ITestSessionsDependencies,
  _event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  setupLogger(context);
  logger.info(LogMessage.TEST_SESSIONS_STARTED);
  return serverErrorResponse;
}

export const lambdaHandler = lambdaHandlerConstructor.bind(
  null,
  runtimeDependencies,
);
