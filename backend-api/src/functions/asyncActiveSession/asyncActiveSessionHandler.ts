import { APIGatewayProxyResult } from "aws-lambda";

export async function lambdaHandler(): Promise<APIGatewayProxyResult> {
  return {
    statusCode: 200,
    body: "Hello, World",
  };
}
