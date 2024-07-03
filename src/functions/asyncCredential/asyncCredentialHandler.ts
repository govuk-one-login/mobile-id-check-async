import { APIGatewayProxyResult } from "aws-lambda";

export async function lambdaHandler(): Promise<APIGatewayProxyResult> {
  return {
    headers: { "Content-Type": "application/json" },
    statusCode: 200,
    body: JSON.stringify({
      message: "Hello World",
    }),
  };
}
