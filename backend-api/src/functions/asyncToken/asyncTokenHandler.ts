import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import "dotenv/config";
import {
  ClientCredentialsService,
  IGetRegisteredIssuerUsingClientSecrets,
} from "../services/clientCredentialsService/clientCredentialsService";
import {
  IProcessRequest,
  RequestService,
} from "./requestService/requestService";
import { IMintToken, TokenService } from "./tokenService/tokenService";
import { Logger } from "../services/logging/logger";
import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { MessageName, registeredLogs } from "./registeredLogs";
import { ConfigService } from "./configService/configService";
import { EventService, IEventService } from "../services/events/eventService";

export async function lambdaHandlerConstructor(
  dependencies: IAsyncTokenRequestDependencies,
  context: Context,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  // Environment variables

  const logger = dependencies.logger();
  logger.addContext(context);
  logger.log("STARTED");

  const configResult = new ConfigService().getConfig(dependencies.env);
  if (configResult.isError) {
    logger.log("ENVIRONMENT_VARIABLE_MISSING", {
      errorMessage: configResult.value,
    });
    return serverErrorResponse;
  }

  const config = configResult.value;

  // Ensure that request contains expected params
  const requestService = dependencies.requestService();
  const processRequestResult = requestService.processRequest(event);

  if (processRequestResult.isError) {
    if (processRequestResult.value === "Invalid grant_type") {
      logger.log("INVALID_REQUEST", {
        errorMessage: processRequestResult.value,
      });
      return badRequestResponseInvalidGrant;
    }

    logger.log("INVALID_REQUEST", { errorMessage: processRequestResult.value });

    return badRequestResponseInvalidAuthorizationHeader;
  }

  const suppliedClientCredentials = processRequestResult.value;

  // Retrieving issuer and validating client secrets
  const clientCredentialsService = dependencies.clientCredentialsService();
  const getRegisteredIssuerByClientSecretsResult =
    await clientCredentialsService.getRegisteredIssuerUsingClientSecrets(suppliedClientCredentials);
  if (getRegisteredIssuerByClientSecretsResult.isError) {

    // TODO: This is intentionally hardcoded on a string. This requires a wider refactor that is in progress and part of the next PR.
    if(getRegisteredIssuerByClientSecretsResult.value === "Unexpected error retrieving issuer") {
      logger.log("INTERNAL_SERVER_ERROR", {
        errorMessage: getRegisteredIssuerByClientSecretsResult.value,
      });
      return serverErrorResponse;
    }
    logger.log("INVALID_REQUEST", {errorMessage:getRegisteredIssuerByClientSecretsResult.value })
    return badRequestResponseInvalidCredentials
  }

  const registeredIssuer = getRegisteredIssuerByClientSecretsResult.value

  const jwtPayload = {
    aud: registeredIssuer,
    iss: config.ISSUER,
    exp: Math.floor(Date.now() / 1000) + 3600,
    scope: "dcmaw.session.async_create",
    // The clientId can be trusted as the credential service validates the incoming clientId against the client registry
    client_id: suppliedClientCredentials.clientId, 
  };

  const tokenService = dependencies.tokenService(config.SIGNING_KEY_ID);

  const mintTokenResult = await tokenService.mintToken(jwtPayload);
  if (mintTokenResult.isError) {
    logger.log("INTERNAL_SERVER_ERROR", {
      errorMessage: mintTokenResult.value,
    });
    return serverErrorResponse;
  }
  const accessToken = mintTokenResult.value;

  const eventWriter = dependencies.eventService(config.SQS_QUEUE);
  const writeEventResult = await eventWriter.writeCredentialTokenIssuedEvent({
    componentId: config.ISSUER,
    getNowInMilliseconds: Date.now,
    eventName: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
  });
  if (writeEventResult.isError) {
    logger.log("ERROR_WRITING_AUDIT_EVENT", {
      errorMessage: writeEventResult.value,
    });
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
  eventService: (sqsQueue: string) => IEventService;
  logger: () => Logger<MessageName>;
  requestService: () => IProcessRequest;
  clientCredentialsService: () => IGetRegisteredIssuerUsingClientSecrets
  tokenService: (signingKey: string) => IMintToken;
}

const dependencies: IAsyncTokenRequestDependencies = {
  env: process.env,
  eventService: (sqsQueue: string) => new EventService(sqsQueue),
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  requestService: () => new RequestService(),
  clientCredentialsService: () => new ClientCredentialsService(),
  tokenService: (signingKey: string) => new TokenService(signingKey),
};

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
