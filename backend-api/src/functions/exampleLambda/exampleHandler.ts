import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDbAdapter, ReadSessionError } from "../adapters/dynamoDbAdapter";
import { SessionRegistry } from "../common/session/sessionRegistry";
import { getConfigFromEnvironment } from "./exampleLambdaConfig";
import { SessionState } from "../common/session/Session";
import { BiometricSessionFinished } from "../common/session/updateOperations/BiometricSessionFinished";

export interface IExampleHandlerDependencies {
  env: NodeJS.ProcessEnv;
  getSessionRegistry: (tableName: string) => SessionRegistry;
}

export const dependencies: IExampleHandlerDependencies = {
  env: process.env,
  getSessionRegistry: (tableName) => new DynamoDbAdapter(tableName),
};

export async function lambdaHandlerConstructor(
  dependencies: IExampleHandlerDependencies,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const configResult = getConfigFromEnvironment(dependencies.env);
  if (configResult.isError) {
    return serverErrorResponse;
  }
  const config = configResult.value;

  const sessionRegistry = dependencies.getSessionRegistry(
    config.SESSIONS_TABLE,
  );
  const sessionResult = await sessionRegistry.getSessionWithState(
    "mockSessionId",
    SessionState.BIOMETRIC_TOKEN_ISSUED,
  );
  if (sessionResult.isError) {
    return handleReadSessionError(sessionResult.value);
  }
  const session = sessionResult.value;

  // do some stuff with the session

  const updateSessionResult = await sessionRegistry.updateSession(
    "mockSessionId",
    new BiometricSessionFinished("mockBiometricSessionId"),
  );
  if (updateSessionResult.isError) {
    return serverErrorResponse;
  }

  return successResponse;
}

export const exampleHandler = lambdaHandlerConstructor.bind(null, dependencies);

function handleReadSessionError(
  error: ReadSessionError,
): APIGatewayProxyResult {
  return error.reason === "not_found"
    ? badRequestResponse
    : serverErrorResponse;
}

const successResponse: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 200,
  body: JSON.stringify({
    someKey: "someValue",
  }),
};

const serverErrorResponse: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 500,
  body: JSON.stringify({
    error: "server_error",
    error_description: "Server Error",
  }),
};

const badRequestResponse: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 400,
  body: JSON.stringify({
    error: "bad_request",
    error_description: "Bad Request",
  }),
};
