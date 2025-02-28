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
import { ErrorCategory } from "../utils/result";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";

export async function lambdaHandlerConstructor(
  dependencies: IAsyncTokenRequestDependencies,
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  logger.resetKeys();
  logger.addContext(context);
  logger.appendKeys({ functionVersion: context.functionVersion });
  logger.info(LogMessage.TOKEN_STARTED);

  const configResult = new ConfigService().getConfig(dependencies.env);
  if (configResult.isError) {
    logger.error(LogMessage.TOKEN_INVALID_CONFIG, {
      errorMessage: configResult.value.errorMessage,
    });
    return serverErrorResponse;
  }

  const config = configResult.value;

  const requestService = dependencies.requestService();

  // Ensure that request contains expected params
  const eventBodyResult = requestService.validateBody(event.body);
  if (eventBodyResult.isError) {
    logger.error(LogMessage.TOKEN_REQUEST_BODY_INVALID, {
      errorMessage: eventBodyResult.value.errorMessage,
    });
    return badRequestResponse("Invalid grant type or grant type not specified");
  }

  const eventHeadersResult = requestService.getClientCredentials(event.headers);
  if (eventHeadersResult.isError) {
    logger.error(LogMessage.TOKEN_REQUEST_HEADERS_INVALID, {
      errorMessage: eventHeadersResult.value.errorMessage,
    });
    return unauthorizedResponse;
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
      ErrorCategory.SERVER_ERROR
    ) {
      logger.error(LogMessage.GET_CLIENT_REGISTRY_FAILURE, {
        errorMessage:
          getRegisteredIssuerByClientSecretsResult.value.errorMessage,
      });
      return serverErrorResponse;
    }
    logger.error(LogMessage.CLIENT_NOT_FOUND_IN_REGISTRY, {
      errorMessage: getRegisteredIssuerByClientSecretsResult.value.errorMessage,
    });
    return badRequestResponse("Supplied client credentials not recognised");
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
    logger.error(LogMessage.TOKEN_FAILED_TO_MINT_TOKEN, {
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
    logger.error(LogMessage.ERROR_WRITING_AUDIT_EVENT, {
      errorMessage:
        "Unexpected error writing the DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED event",
    });
    return serverErrorResponse;
  }
  logger.info(LogMessage.TOKEN_COMPLETED);

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

const badRequestResponse = (
  errorDescription: string,
): APIGatewayProxyResult => {
  return {
    headers: { "Content-Type": "application/json" },
    statusCode: 400,
    body: JSON.stringify({
      error: "invalid_grant",
      error_description: errorDescription,
    }),
  };
};

const unauthorizedResponse: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 401,
  body: JSON.stringify({
    error: "invalid_client",
    error_description: "Invalid or missing authorization header",
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
