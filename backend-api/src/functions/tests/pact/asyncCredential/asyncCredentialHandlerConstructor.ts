import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { lambdaHandlerConstructor } from "../../../asyncCredential/asyncCredentialHandler";
import { buildRequest } from "../../../testUtils/mockRequest";
import { buildLambdaContext } from "../../../testUtils/mockContext";
import { Dependencies } from "../../../asyncCredential/handlerDependencies";

export async function asyncCredentialHandlerConstructor(
  requestConfig: IAsyncCredentialHandlerConfig,
): Promise<APIGatewayProxyResult> {
  const event: APIGatewayProxyEvent = buildRequest(requestConfig);
  const context = buildLambdaContext();

  return await lambdaHandlerConstructor(
    requestConfig.dependencies,
    event,
  );
}

interface IAsyncCredentialHandlerConfig {
  headers: { [name: string]: string | string[] | undefined };
  body: string | null;
  dependencies: Dependencies;
}
