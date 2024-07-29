import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  IGetClientCredentials,
  IGetClientCredentialsById,
  IValidateAsyncCredentialRequest,
  IValidateAsyncTokenRequest,
} from "../services/clientCredentialsService/clientCredentialsService";
import {
  IDecodedToken,
  IDecodeToken,
  IVerifyTokenSignature,
} from "./tokenService/tokenService";
import { errorResult, Result, successResult } from "../utils/result";
import {
  ICreateSession,
  IGetActiveSession,
} from "./sessionService/sessionService";
import { Logger } from "../services/logging/logger";
import { MessageName } from "./registeredLogs";
import { IEventService } from "../services/events/eventService";
import { ConfigService } from "./configService/configService";

export async function lambdaHandler(
  event: APIGatewayProxyEvent,
  dependencies: Dependencies,
): Promise<APIGatewayProxyResult> {
  const logger = dependencies.logger();

  const configResult = new ConfigService().getConfig(dependencies.env);
  if (configResult.isError) {
    logger.log("ENVIRONMENT_VARIABLE_MISSING", {
      errorMessage: configResult.value,
    });
    return serverError500Response;
  }
  const config = configResult.value;

  const authorizationHeaderResult = getAuthorizationHeader(
    event.headers["Authorization"],
  );
  if (authorizationHeaderResult.isError) {
    logger.log("AUTHENTICATION_HEADER_INVALID", {
      errorMessage: authorizationHeaderResult.value,
    });
    return unauthorizedResponse;
  }
  const authorizationHeader = authorizationHeaderResult.value;

  // JWT Claim validation
  const tokenService = dependencies.tokenService();
  const validTokenClaimsResult = tokenService.getDecodedToken({
    authorizationHeader,
    issuer: config.ISSUER,
  });
  if (validTokenClaimsResult.isError) {
    logger.log("JWT_CLAIM_INVALID", {
      errorMessage: validTokenClaimsResult.value,
    });
    return badRequestResponse({
      error: "invalid_token",
      errorDescription: validTokenClaimsResult.value,
    });
  }
  const { encodedJwt, jwtPayload } =
    validTokenClaimsResult.value as IDecodedToken;

  const requestBodyResult = getRequestBody(event.body, jwtPayload.client_id);
  if (requestBodyResult.isError) {
    logger.log("REQUEST_BODY_INVALID", {
      errorMessage: requestBodyResult.value,
    });

    return badRequestResponse({
      error: "invalid_request",
      errorDescription: "Request body validation failed",
    });
  }
  const requestBody = requestBodyResult.value;

  const verifyTokenSignatureResult = await tokenService.verifyTokenSignature(
    config.SIGNING_KEY_ID,
    encodedJwt,
  );
  if (verifyTokenSignatureResult.isError) {
    logger.log("TOKEN_SIGNATURE_INVALID", {
      errorMessage: verifyTokenSignatureResult.value,
    });
    return unauthorizedResponseInvalidSignature;
  }

  // Fetching stored client credentials
  const clientCredentialsService = dependencies.clientCredentialsService();
  const registeredClientCredentialsArrayResult =
    await clientCredentialsService.getRegisteredClientCredentials();
  if (registeredClientCredentialsArrayResult.isError) {
    logger.log("ERROR_RETRIEVING_CLIENT_CREDENTIALS", {
      errorMessage: registeredClientCredentialsArrayResult.value,
    });
    return serverError500Response;
  }
  const registeredClientCredentialsArray =
    registeredClientCredentialsArrayResult.value;

  // Retrieving credentials from client credential array
  const registeredClientCredentialsByIdResult =
    clientCredentialsService.getRegisteredClientCredentialsById(
      registeredClientCredentialsArray,
      jwtPayload.client_id,
    );
  if (registeredClientCredentialsByIdResult.isError) {
    logger.log("CLIENT_CREDENTIALS_INVALID", {
      errorMessage: registeredClientCredentialsByIdResult.value,
    });

    return badRequestResponse({
      error: "invalid_client",
      errorDescription: "Supplied client not recognised",
    });
  }
  const registeredClientCredentials =
    registeredClientCredentialsByIdResult.value;

  const validateClientCredentialsResult =
    clientCredentialsService.validateAsyncCredentialRequest({
      aud: jwtPayload.aud,
      issuer: registeredClientCredentials.issuer,
      registeredClientCredentials,
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

  const activeSessionResult = await sessionService.getActiveSession(
    requestBody.sub,
    config.SESSION_TTL_IN_MILLISECONDS,
  );
  if (activeSessionResult.isError) {
    logger.log("ERROR_RETRIEVING_SESSION", {
      errorMessage: "Unexpected error checking for existing session",
    });
    return serverError500Response;
  }
  if (activeSessionResult.value) {
    logger.setSessionId({ sessionId: activeSessionResult.value });
    logger.log("COMPLETED");
    return activeSessionFoundResponse(requestBody.sub);
  }

  const createSessionResult = await sessionService.createSession({
    ...requestBody,
    issuer: jwtPayload.iss,
  });
  const sessionId = createSessionResult.value;
  const eventService = dependencies.eventService(config.SQS_QUEUE);
  if (createSessionResult.isError) {
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
    IValidateAsyncTokenRequest &
    IValidateAsyncCredentialRequest &
    IGetClientCredentialsById;
  sessionService: (
    tableName: string,
    indexName: string,
  ) => IGetActiveSession & ICreateSession;
  env: NodeJS.ProcessEnv;
}
