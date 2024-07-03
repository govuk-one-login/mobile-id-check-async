import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TokenService } from "./TokenService/tokenService.test";

export async function lambdaHandler(
  event: APIGatewayProxyEvent,
  dependencies: Dependencies,
): Promise<APIGatewayProxyResult> {
  const bearerToken = event.headers["Authorization"];

  if (bearerToken == null) {
    return {
      headers: { "Content-Type": "application/json" },
      statusCode: 401,
      body: "Unauthorized",
    };
  }

  if (!bearerToken.startsWith("Bearer ")) {
    return {
      headers: { "Content-Type": "application/json" },
      statusCode: 401,
      body: "Unauthorized",
    };
  }

  if (bearerToken.split(" ").length !== 2) {
    return {
      headers: { "Content-Type": "application/json" },
      statusCode: 401,
      body: "Unauthorized",
    };
  }

  return {
    headers: { "Content-Type": "application/json" },
    statusCode: 200,
    body: JSON.stringify({
      message: "Hello World",
    }),
  };
}

export interface Dependencies {
  tokenService: (keyId: string) => TokenService;
}
