import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  IGetClientCredentialsById,
  IValidateAsyncCredentialRequest,
  IValidateTokenRequest,
} from "../services/clientCredentialsService/clientCredentialsService";
import {
  IDecodedToken,
  IDecodeToken,
  IVerifyTokenSignature,
} from "./TokenService/tokenService";
import { errorResult, Result, successResult } from "../utils/result";
import {
  ICreateSession,
  IGetActiveSession,
} from "./sessionService/sessionService";
import { Logger } from "../services/logging/logger";
import { MessageName } from "./registeredLogs";
import { IGetClientCredentials } from "../asyncToken/ssmService/ssmService";
import { IEventService } from "../services/events/eventService";
import { ConfigService } from "./configService/configService";

export async function lambdaHandler(
  event: APIGatewayProxyEvent,
  dependencies: Dependencies,
): Promise<APIGatewayProxyResult> {
  const logger = dependencies.logger();
  const configResponse = new ConfigService().getConfig(dependencies.env);

  if (configResponse.isError) {
    logger.log("ENVIRONMENT_VARIABLE_MISSING", {
      errorMessage: configResponse.value,
    });
    return serverError500Response;
  }

  const config = configResponse.value;

  const authorizationHeaderOrError = getAuthorizationHeader(
    event.headers["Authorization"],
  );
  if (authorizationHeaderOrError.isError) {
    logger.log("AUTHENTICATION_HEADER_INVALID", {
      errorMessage: authorizationHeaderOrError.value,
    });
    return unauthorizedResponse;
  }

  const authorizationHeader = authorizationHeaderOrError.value;

  // JWT Claim validation
  const tokenService = dependencies.tokenService();
  const validTokenClaimsOrError = tokenService.getDecodedToken({
    authorizationHeader,
    issuer: config.ISSUER,
  });
  if (validTokenClaimsOrError.isError) {
    logger.log("JWT_CLAIM_INVALID", {
      errorMessage: validTokenClaimsOrError.value,
    });
    return badRequestResponse({
      error: "invalid_token",
      errorDescription: validTokenClaimsOrError.value,
    });
  }
  const { encodedJwt, jwtPayload } =
    validTokenClaimsOrError.value as IDecodedToken;

  const requestBodyOrError = getRequestBody(event.body, jwtPayload.client_id);

  if (requestBodyOrError.isError) {
    logger.log("REQUEST_BODY_INVALID", {
      errorMessage: requestBodyOrError.value,
    });

    return badRequestResponse({
      error: "invalid_request",
      errorDescription: "Request body validation failed",
    });
  }
  const requestBody = requestBodyOrError.value;

  const result = await tokenService.verifyTokenSignature(
    config.SIGNING_KEY_ID,
    encodedJwt,
  );
  if (result.isError) {
    logger.log("TOKEN_SIGNATURE_INVALID", {
      errorMessage: result.value,
    });
    return unauthorizedResponseInvalidSignature;
  }

  // Fetching stored client credentials
  const clientCredentialsService = dependencies.clientCredentialsService();
  const clientCredentialsResult =
    await clientCredentialsService.getClientCredentials();
  if (clientCredentialsResult.isError) {
    logger.log("ERROR_RETRIEVING_CLIENT_CREDENTIALS", {
      errorMessage: clientCredentialsResult.value,
    });
    return serverError500Response;
  }
  const storedCredentialsArray = clientCredentialsResult.value;

  // Retrieving credentials from client credential array
  const clientCredentialResponse =
    clientCredentialsService.getClientCredentialsById(
      storedCredentialsArray,
      jwtPayload.client_id,
    );
  if (clientCredentialResponse.isError) {
    logger.log("CLIENT_CREDENTIALS_INVALID", {
      errorMessage: clientCredentialResponse.value,
    });

    return badRequestResponse({
      error: "invalid_client",
      errorDescription: "Supplied client not recognised",
    });
  }

  const clientCredentials = clientCredentialResponse.value;

  const validateClientCredentialsResult =
    clientCredentialsService.validateAsyncCredentialRequest({
      aud: jwtPayload.aud,
      issuer: clientCredentials.issuer,
      storedCredentials: clientCredentials,
      redirectUri: requestBody.redirect_uri,
    });

  if (validateClientCredentialsResult.isError) {
    logger.log("REQUEST_BODY_INVALID", {
      errorMessage: validateClientCredentialsResult.value,
    });

    return badRequestResponse({
      error: "invalid_request",
      errorDescription: validateClientCredentialsResult.value,
    });
  }

  const sessionService = dependencies.sessionService(
    config.SESSION_TABLE_NAME,
    config.SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME,
  );

  const getActiveSessionResponse = await sessionService.getActiveSession(
    requestBody.sub,
    config.SESSION_TTL_IN_MILLISECONDS,
  );
  if (getActiveSessionResponse.isError) {
    logger.log("ERROR_RETRIEVING_SESSION", {
      errorMessage: "Unexpected error checking for existing session",
    });
    return serverError500Response;
  }

  if (getActiveSessionResponse.value) {
    logger.setSessionId({ sessionId: getActiveSessionResponse.value });
    logger.log("COMPLETED");
    return activeSessionFoundResponse(requestBody.sub);
  }

  const sessionServiceCreateSessionResult = await sessionService.createSession({
    ...requestBody,
    issuer: jwtPayload.iss,
  });

  const sessionId = sessionServiceCreateSessionResult.value;

  const eventService = dependencies.eventService(config.SQS_QUEUE);

  if (sessionServiceCreateSessionResult.isError) {
    logger.log("ERROR_CREATING_SESSION");
    return serverError500Response;
  }

  logger.setSessionId({ sessionId });

  const writeEventResult = await eventService.writeGenericEvent({
    eventName: "DCMAW_ASYNC_CRI_START",
    sub: requestBody.sub,
    sessionId,
    govukSigninJourneyId: requestBody.govuk_signin_journey_id,
    getNowInMilliseconds: Date.now,
    componentId: config.ISSUER,
  });

  if (writeEventResult.isError) {
    logger.log("ERROR_WRITING_AUDIT_EVENT", {
      errorMessage: "Unexpected error writing the DCMAW_ASYNC_CRI_START event",
    });
    return serverError500Response;
  }

  logger.log("COMPLETED");
  return sessionCreatedResponse(requestBody.sub);
}

const getAuthorizationHeader = (
  authorizationHeader: string | undefined,
): Result<string> => {
  if (authorizationHeader == null) {
    return errorResult("No Authentication header present");
  }

  if (!authorizationHeader.startsWith("Bearer ")) {
    return errorResult(
      "Invalid authentication header format - does not start with Bearer",
    );
  }

  if (authorizationHeader.split(" ").length !== 2) {
    return errorResult(
      "Invalid authentication header format - contains spaces",
    );
  }

  if (authorizationHeader.split(" ")[1].length == 0) {
    return errorResult("Invalid authentication header format - missing token");
  }

  return successResult(authorizationHeader);
};

const getRequestBody = (
  requestBody: string | null,
  jwtClientId: string,
): Result<IRequestBody> => {
  if (requestBody == null) {
    return errorResult("Missing request body");
  }

  let body: IRequestBody;
  try {
    body = JSON.parse(requestBody);
  } catch (e) {
    return errorResult("Invalid JSON in request body");
  }

  if (!body.state) {
    return errorResult("Missing state in request body");
  }

  if (!body.sub) {
    return errorResult("Missing sub in request body");
  }

  if (!body.client_id) {
    return errorResult("Missing client_id in request body");
  }

  if (body.client_id !== jwtClientId) {
    return errorResult(
      "client_id in request body does not match value in access_token",
    );
  }

  if (!body["govuk_signin_journey_id"]) {
    return errorResult("Missing govuk_signin_journey_id in request body");
  }

  if (body.redirect_uri) {
    try {
      new URL(body.redirect_uri);
    } catch (e) {
      return errorResult("redirect_uri in request body is not a URL");
    }
  }

  return successResult(body);
};

const badRequestResponse = (responseInput: {
  error: string;
  errorDescription: string;
}) => {
  return {
    headers: { "Content-Type": "application/json" },
    statusCode: 400,
    body: JSON.stringify({
      error: responseInput.error,
      error_description: responseInput.errorDescription,
    }),
  };
};

const unauthorizedResponse = {
  headers: { "Content-Type": "application/json" },
  statusCode: 401,
  body: JSON.stringify({
    error: "Unauthorized",
    error_description: "Invalid token",
  }),
};

const unauthorizedResponseInvalidSignature = {
  headers: { "Content-Type": "application/json" },
  statusCode: 401,
  body: JSON.stringify({
    error: "Unauthorized",
    error_description: "Invalid signature",
  }),
};

const serverError500Response: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 500,
  body: JSON.stringify({
    error: "server_error",
    error_description: "Server Error",
  }),
};

const activeSessionFoundResponse = (sub: string): APIGatewayProxyResult => {
  return {
    headers: { "Content-Type": "application/json" },
    statusCode: 200,
    body: JSON.stringify({
      sub,
      "https://vocab.account.gov.uk/v1/credentialStatus": "pending",
    }),
  };
};

const sessionCreatedResponse = (sub: string): APIGatewayProxyResult => {
  return {
    headers: { "Content-Type": "application/json" },
    statusCode: 201,
    body: JSON.stringify({
      sub,
      "https://vocab.account.gov.uk/v1/credentialStatus": "pending",
    }),
  };
};

export interface IRequestBody {
  sub: string;
  govuk_signin_journey_id: string;
  client_id: string;
  state: string;
  redirect_uri?: string;
}

export interface Dependencies {
  logger: () => Logger<MessageName>;
  eventService: (sqsQueue: string) => IEventService;
  tokenService: () => IDecodeToken & IVerifyTokenSignature;
  clientCredentialsService: () => IGetClientCredentials &
    IValidateTokenRequest &
    IValidateAsyncCredentialRequest &
    IGetClientCredentialsById;
  ssmService: () => IGetClientCredentials;
  sessionService: (
    tableName: string,
    indexName: string,
  ) => IGetActiveSession & ICreateSession;
  env: NodeJS.ProcessEnv;
}
