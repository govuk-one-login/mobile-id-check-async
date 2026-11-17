import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { serverErrorResponse } from "../common/lambdaResponses";

export async function lambdaHandlerConstructor(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  return serverErrorResponse;
}
