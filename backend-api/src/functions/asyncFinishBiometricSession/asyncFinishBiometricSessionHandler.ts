import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { notImplementedResponse } from "../common/lambdaResponses";
import {
  IAsyncFinishBiometricSessionDependencies,
  runtimeDependencies,
} from "./handlerDependencies";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";

export async function lambdaHandlerConstructor(
  _dependencies: IAsyncFinishBiometricSessionDependencies,
  _event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  logger.resetKeys();
  logger.addContext(context);
  logger.info(LogMessage.FINISH_BIOMETRIC_SESSION_STARTED);

  logger.info(LogMessage.FINISH_BIOMETRIC_SESSION_COMPLETED);
  return notImplementedResponse;
}

export const lambdaHandler = lambdaHandlerConstructor.bind(
  null,
  runtimeDependencies,
);
