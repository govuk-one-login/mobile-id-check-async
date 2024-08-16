import { APIGatewayProxyResult, Context } from "aws-lambda";
import { Dependencies, dependencies } from "./handlerDependencies";

export async function lambdaHandlerConstructor(
  dependencies: Dependencies,
  context: Context,
): Promise<APIGatewayProxyResult> {
  const logger = dependencies.logger();
  logger.addContext(context);

  logger.log("STARTED");

  const accessToken = "accessToken";

  logger.log("COMPLETED");

  return {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
    statusCode: 200,
    body: JSON.stringify({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
    }),
  };
}

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
