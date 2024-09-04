import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import {
  dependencies,
  IAsyncTokenRequestDependencies,
} from "../asyncToken/handlerDependencies";

export async function lambdaHandlerConstructor(
  dependencies: IAsyncTokenRequestDependencies,
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  // Environment variables

  const logger = dependencies.logger();
  logger.addContext(context);
  logger.log("STARTED");
  logger.log("COMPLETED");

  return {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
    statusCode: 200,
    body: "",
  };
}

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
