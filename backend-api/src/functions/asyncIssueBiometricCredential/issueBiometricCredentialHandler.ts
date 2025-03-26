import {
  APIGatewayProxyResult,
  Context,
  SQSEvent,
} from "aws-lambda";
import { notImplementedResponse } from "../common/lambdaResponses";
import {
  IssueBiometricCredentialDependencies,
  runtimeDependencies,
} from "./handlerDependencies";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { setupLogger } from "../common/logging/setupLogger";

export async function lambdaHandlerConstructor(
  _dependencies: IssueBiometricCredentialDependencies,
  _event: SQSEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  setupLogger(context);
  logger.info(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_STARTED);

  logger.info(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED);
  return notImplementedResponse;
}

export const lambdaHandler = lambdaHandlerConstructor.bind(
  null,
  runtimeDependencies,
);