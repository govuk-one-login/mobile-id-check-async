import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { lambdaHandlerConstructor } from "../../../asyncToken/asyncTokenHandler";
import { buildRequest } from "../../../testUtils/mockRequest";
import { buildLambdaContext } from "../../../testUtils/mockContext";
import { IAsyncTokenRequestDependencies } from "../../../asyncToken/handlerDependencies";

export async function asyncTokenHandlerConstructor(
  requestConfig: IAsyncTokenHandlerConfig,
): Promise<APIGatewayProxyResult> {
  const event: APIGatewayProxyEvent = buildRequest(requestConfig);
  const context = buildLambdaContext();

  return await lambdaHandlerConstructor(
    requestConfig.dependencies,
    context,
    event,
  );
}

interface IAsyncTokenHandlerConfig {
  headers: { [name: string]: string | string[] | undefined };
  body: string | null;
  dependencies: IAsyncTokenRequestDependencies;
}
