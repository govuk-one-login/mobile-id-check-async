import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  IAsyncTokenRequestDependencies,
  lambdaHandlerConstructor,
} from "../../../asyncToken/asyncTokenHandler";
import { buildRequest } from "../../../testUtils/mockRequest";
import { buildLambdaContext } from "../../../testUtils/mockContext";
import { MockEventWriterSuccess } from "../../../services/events/tests/mocks";
import { MockLoggingAdapter } from "../../../services/logging/tests/mockLogger";
import { Logger } from "../../../services/logging/logger";
import {
  MockRequestServiceSuccessResult,
  MockClientRegistryServiceSuccessResult,
  MockTokenServiceSuccessResult,
} from "../../../asyncToken/asyncTokenHandler.test";
import {
  registeredLogs,
} from "../../../asyncToken/registeredLogs";

export async function asyncTokenHandlerConstructor(): Promise<APIGatewayProxyResult> {
  const env = {
    SIGNING_KEY_ID: "mockSigningKeyId",
    ISSUER: "mockIssuer",
    SQS_QUEUE: "mockSQSQueue",
    CLIENT_REGISTRY_PARAMETER_NAME: "mockParmaterName",
  };

  const mockLogger = new MockLoggingAdapter();
  const dependencies: IAsyncTokenRequestDependencies = {
    env,
    eventService: () => new MockEventWriterSuccess(),
    logger: () => new Logger(mockLogger, registeredLogs),
    requestService: () => new MockRequestServiceSuccessResult(),
    clientRegistryService: () => new MockClientRegistryServiceSuccessResult(),
    tokenService: () => new MockTokenServiceSuccessResult(),
  };

  const event: APIGatewayProxyEvent = buildRequest();
  const context = buildLambdaContext();

  return await lambdaHandlerConstructor(dependencies, context, event);
}
