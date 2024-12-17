import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import {
  dependencies,
  IAsyncBiometricTokenDependencies,
} from "./handlerDependencies";

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

const notImplementedResponse: APIGatewayProxyResult = {
  headers: {
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
    "Strict-Transport-Security": "max-age=31536000",
    "X-Content-Type-Options": " nosniff",
    "X-Frame-Options": "DENY",
  },
  statusCode: 501,
  body: JSON.stringify({ error: "Not Implemented" }),
};


