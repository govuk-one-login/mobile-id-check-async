import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import "dotenv/config";
import { validOrThrow } from "../config";
import {
  ClientCredentialsService,
  IClientCredentials,
  IClientCredentialsService,
} from "../services/clientCredentialsService/clientCredentialsService";
import {
  IProcessRequest,
  RequestService,
} from "./requestService/requestService";
import { IGetClientCredentials, SsmService } from "./ssmService/ssmService";
import { IMintToken, TokenService } from "./tokenService/tokenService";
import { IDecodedClientCredentials } from "../types/clientCredentials";
import { Logger } from "../services/logging/logger";
import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { MessageName, registeredLogs } from "./registeredLogs";

export async function lambdaHandlerConstructor(
  dependencies: IAsyncTokenRequestDependencies,
  context: Context,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  // Environment variables

  const logger = dependencies.logger();
  logger.addContext(context);
  logger.log("STARTED");
  let kidArn;
  try {
    kidArn = validOrThrow(dependencies.env, "SIGNING_KEY_ID");
  } catch (error) {
    logger.log("ENVIRONMENT_VARIABLE_MISSING", {
      environmentVariable: "SIGNING_KEY_IDS",
    });

    return serverErrorResponse;
  }

  // Ensure that request contains expected params
  const requestService = dependencies.requestService();
  const processRequest = requestService.processRequest(event);

  if (processRequest.isError) {
    if (processRequest.value === "Invalid grant_type") {
      logger.log("INVALID_REQUEST", { errorMessage: processRequest.value });
      return badRequestResponseInvalidGrant;
    }

    logger.log("INVALID_REQUEST", { errorMessage: processRequest.value });

    return badRequestResponseInvalidAuthorizationHeader;
  }

  const suppliedCredentials = processRequest.value as IDecodedClientCredentials;

  // Fetching stored client credentials
  const ssmService = dependencies.ssmService();
  const ssmServiceResponse = await ssmService.getClientCredentials();
  if (ssmServiceResponse.isError) {
    return serverErrorResponse;
  }

  const storedCredentialsArray =
    ssmServiceResponse.value as IClientCredentials[];

  // Incoming credentials match stored credentials
  const clientCredentialsService = dependencies.clientCredentialService();
  const storedCredentials = clientCredentialsService.getClientCredentialsById(
    storedCredentialsArray,
    suppliedCredentials.clientId,
  );
  if (!storedCredentials) {
    return badRequestResponseInvalidCredentials;
  }

  const isValidClientCredentials = clientCredentialsService.validate(
    storedCredentials,
    suppliedCredentials,
  );
  if (!isValidClientCredentials) {
    return badRequestResponseInvalidCredentials;
  }

  const jwtPayload = {
    aud: storedCredentials.issuer,
    iss: "https://www.review-b.account.gov.uk",
    exp: Math.floor(Date.now() / 1000) + 3600,
    scope: "dcmaw.session.async_create",
    client_id: storedCredentials.client_id,
  };

  let accessToken;
  const tokenService = dependencies.tokenService(kidArn);
  try {
    accessToken = await tokenService.mintToken(jwtPayload);
  } catch (error) {
    return serverErrorResponse;
  }

  logger.log("COMPLETED");

  return {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
    statusCode: 200,
    body: JSON.stringify({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
    }),
  };
}

const badRequestResponseInvalidGrant: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 400,
  body: JSON.stringify({
    error: "invalid_grant",
    error_description: "Invalid grant type or grant type not specified",
  }),
};

const badRequestResponseInvalidAuthorizationHeader: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 400,
  body: JSON.stringify({
    error: "invalid_authorization_header",
    error_description: "Invalid authorization header",
  }),
};

const badRequestResponseInvalidCredentials: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 400,
  body: JSON.stringify({
    error: "invalid_client",
    error_description: "Supplied client credentials not recognised",
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

export interface IAsyncTokenRequestDependencies {
  env: NodeJS.ProcessEnv;
  logger: () => Logger<MessageName>;
  requestService: () => IProcessRequest;
  ssmService: () => IGetClientCredentials;
  clientCredentialService: () => IClientCredentialsService;
  tokenService: (signingKey: string) => IMintToken;
}

const dependencies: IAsyncTokenRequestDependencies = {
  env: process.env,
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  requestService: () => new RequestService(),
  ssmService: () => new SsmService(),
  clientCredentialService: () => new ClientCredentialsService(),
  tokenService: (signingKey: string) => new TokenService(signingKey),
};

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
