import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";

import axios from "axios";
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

  const axiosInstance = axios.create({
    validateStatus: (status: number) => {
      return status < 500;
    },
  });
  const result = await axiosInstance.post(
    "https://ka0sgf3ub8.execute-api.eu-west-2.amazonaws.com/dev/async/token",
    { grant_type: "client_credentials" },
  );
  console.log(result.status);
  console.log(result.data);
  logger.log("COMPLETED");

  return {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
    statusCode: 200,
    body: JSON.stringify(result.data),
  };
}

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
