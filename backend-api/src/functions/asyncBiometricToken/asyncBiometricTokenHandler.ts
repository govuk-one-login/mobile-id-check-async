import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import {
  dependencies,
  IAsyncBiometricTokenDependencies,
} from "./handlerDependencies";
import { notImplementedResponse } from "./responses";

export async function lambdaHandlerConstructor(
  dependencies: IAsyncBiometricTokenDependencies,
  _event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  const logger = dependencies.logger();
  logger.addContext(context);
  logger.log("STARTED");

  logger.log("COMPLETED");
  return notImplementedResponse;
}

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
