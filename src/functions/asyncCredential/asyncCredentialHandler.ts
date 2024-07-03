import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export async function lambdaHandler(
  event: APIGatewayProxyEvent,
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

  if (bearerToken.split("").length !== 2) {
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
