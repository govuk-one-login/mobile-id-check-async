import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { ConfigService } from "./configService/configService";
import {
  dependencies,
  IAsyncTokenRequestDependencies,
} from "./handlerDependencies";

export async function lambdaHandlerConstructor(
  dependencies: IAsyncTokenRequestDependencies,
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  // Environment variables

  const logger = dependencies.logger();
  logger.addContext(context);
  logger.log("STARTED");

  const configResult = new ConfigService().getConfig(dependencies.env);
  if (configResult.isError) {
    logger.log("ENVIRONMENT_VARIABLE_MISSING", {
      errorMessage: configResult.value.errorMessage,
    });
    return serverErrorResponse;
  }

  const config = configResult.value;

  const requestService = dependencies.requestService();

  // Ensure that request contains expected params
  const eventBodyResult = requestService.validateBody(event.body);
  if (eventBodyResult.isError) {
    logger.log("INVALID_REQUEST", {
      errorMessage: eventBodyResult.value.errorMessage,
    });
    return badRequestResponseInvalidGrant;
  }

  const eventHeadersResult = requestService.getClientCredentials(event.headers);
  if (eventHeadersResult.isError) {
    logger.log("INVALID_REQUEST", {
      errorMessage: eventHeadersResult.value.errorMessage,
    });
    return unauthorisedResponseInvalidAuthorizationHeader;
  }

  const clientCredentials = eventHeadersResult.value;

  // Retrieving issuer and validating client secrets
  const clientRegistryService = dependencies.clientRegistryService(
    config.CLIENT_REGISTRY_SECRET_NAME,
  );
  const getRegisteredIssuerByClientSecretsResult =
    await clientRegistryService.getRegisteredIssuerUsingClientSecrets(
      clientCredentials,
    );
  if (getRegisteredIssuerByClientSecretsResult.isError) {
    if (
      getRegisteredIssuerByClientSecretsResult.value.errorCategory ===
      "SERVER_ERROR"
    ) {
      logger.log("INTERNAL_SERVER_ERROR", {
        errorMessage:
          getRegisteredIssuerByClientSecretsResult.value.errorMessage,
      });
      return serverErrorResponse;
    }
    logger.log("INVALID_REQUEST", {
      errorMessage: getRegisteredIssuerByClientSecretsResult.value.errorMessage,
    });
    return badRequestResponseInvalidCredentials;
  }

  const registeredIssuer = getRegisteredIssuerByClientSecretsResult.value;

  const jwtPayload = {
    aud: registeredIssuer,
    iss: config.ISSUER,
    exp: Math.floor(Date.now() / 1000) + 3600,
    scope: "dcmaw.session.async_create",
    // The clientId can be trusted as the credential service validates the incoming clientId against the client registry
    client_id: clientCredentials.clientId,
  };

  const tokenService = dependencies.tokenService(config.SIGNING_KEY_ID);

  const mintTokenResult = await tokenService.mintToken(jwtPayload);
  if (mintTokenResult.isError) {
    logger.log("INTERNAL_SERVER_ERROR", {
      errorMessage: mintTokenResult.value.errorMessage,
    });
    return serverErrorResponse;
  }
  const accessToken = mintTokenResult.value;

  const eventWriter = dependencies.eventService(config.TXMA_SQS);
  const writeEventResult = await eventWriter.writeCredentialTokenIssuedEvent({
    componentId: config.ISSUER,
    getNowInMilliseconds: Date.now,
    eventName: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
  });
  if (writeEventResult.isError) {
    logger.log("ERROR_WRITING_AUDIT_EVENT", {
      errorMessage: writeEventResult.value.errorMessage,
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

const unauthorisedResponseInvalidAuthorizationHeader: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 401,
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

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
