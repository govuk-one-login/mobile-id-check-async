import { APIGatewayProxyResult } from "aws-lambda";

export async function lambdaHandlerConstructor(): Promise<APIGatewayProxyResult> {
  return {
    statusCode: 200,
    body: "Hello, World"
  }
}