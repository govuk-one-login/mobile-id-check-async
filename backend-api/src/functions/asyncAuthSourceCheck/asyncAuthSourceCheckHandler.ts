import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { notImplementedResponse } from "../common/lambdaResponses";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { setupLogger } from "../common/logging/setupLogger";
import { getHeader } from "../common/request/getHeader/getHeader";

export async function lambdaHandlerConstructor(
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  setupLogger(context, getHeader(event.headers, "User-Agent"));

  logger.info(LogMessage.AUTH_SOURCE_CHECK_STARTED);

  return notImplementedResponse;
}
