import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { lambdaHandlerConstructor } from "../../../asyncCredential/asyncCredentialHandler";
import { buildRequest } from "../../../testUtils/mockRequest";
import { IAsyncCredentialDependencies } from "../../../asyncCredential/handlerDependencies";

export async function asyncCredentialHandlerConstructor(
  requestConfig: IAsyncCredentialHandlerConfig,
): Promise<APIGatewayProxyResult> {
  const event: APIGatewayProxyEvent = buildRequest(requestConfig);

  return await lambdaHandlerConstructor(requestConfig.dependencies, event);
}

interface IAsyncCredentialHandlerConfig {
  headers: { [name: string]: string | string[] | undefined };
  body: string | null;
  dependencies: IAsyncCredentialDependencies;
}
