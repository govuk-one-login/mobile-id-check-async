import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";

import { setupLogger } from "../common/logging/setupLogger";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import {
  badRequestResponse,
  notImplementedResponse,
} from "../common/lambdaResponses";

export async function lambdaHandlerConstructor(
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  setupLogger(context);
  logger.info(LogMessage.PUT_SESSION_STARTED);

  if (!event.pathParameters?.sessionId) {
    logger.error(LogMessage.PUT_SESSION_REQUEST_PATH_PARAM_INVALID, {
      pathParameters: event.pathParameters,
    });
    return badRequestResponse(
      "invalid_request",
      "missing sessionId path parameter",
    );
  }

  logger.info(LogMessage.PUT_SESSION_COMPLETED);
  return notImplementedResponse;
}

export const lambdaHandler = lambdaHandlerConstructor.bind(null);
