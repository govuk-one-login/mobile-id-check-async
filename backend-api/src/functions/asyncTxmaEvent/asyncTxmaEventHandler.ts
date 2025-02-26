import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import {
  IAsyncTxmaEventDependencies,
  runtimeDependencies,
} from "./handlerDependencies";
import { notImplementedResponse } from "../common/lambdaResponses";

export async function lambdaHandlerConstructor(
  _dependencies: IAsyncTxmaEventDependencies,
  _event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  logger.resetKeys();
  logger.addContext(context);
  logger.info(LogMessage.TXMA_EVENT_STARTED);

  logger.info(LogMessage.TXMA_EVENT_COMPLETED);

  return notImplementedResponse;
}

export const lambdaHandler = lambdaHandlerConstructor.bind(
  null,
  runtimeDependencies,
);
