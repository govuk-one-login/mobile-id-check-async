import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { IDecodedToken } from "./tokenService/tokenService";
import { errorResult, Result, successResult } from "../utils/result";
import {} from "./sessionService/sessionService";
import { ConfigService } from "./configService/configService";
import { IAsyncCredentialDependencies, dependencies } from "./handlerDependencies";

export async function lambdaHandlerConstructor(
  dependencies: IAsyncCredentialDependencies,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const logger = dependencies.logger();

  // Get environment variables
  const configResult = new ConfigService().getConfig(dependencies.env);
  if (configResult.isError) {
    logger.log("ENVIRONMENT_VARIABLE_MISSING", {
      errorMessage: configResult.value.errorMessage,
    });
    return serverError500Response;
  }
  const config = configResult.value;

  const authorizationHeaderResult = getAuthorizationHeader(
    event.headers["Authorization"] ?? event.headers["authorization"],
  );
  if (authorizationHeaderResult.isError) {
    logger.log("AUTHENTICATION_HEADER_INVALID", {
      errorMessage: authorizationHeaderResult.value.errorMessage,
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
      errorMessage: validTokenClaimsResult.value.errorMessage,
    });
    return badRequestResponse({
      error: "invalid_token",
      errorDescription: validTokenClaimsResult.value.errorMessage,
    });
  }
  const { encodedJwt, jwtPayload } =
    validTokenClaimsResult.value as IDecodedToken;

  // Validate request body
  const requestBodyResult = getRequestBody(event.body, jwtPayload.client_id);
  if (requestBodyResult.isError) {
    logger.log("REQUEST_BODY_INVALID", {
      errorMessage: requestBodyResult.value.errorMessage,
    });

    return badRequestResponse({
      error: "invalid_request",
      errorDescription: "Request body validation failed",
    });
  }
  const requestBody = requestBodyResult.value;

  // Check token signature
  const verifyTokenSignatureResult = await tokenService.verifyTokenSignature(
    config.SIGNING_KEY_ID,
    encodedJwt,
  );
  if (verifyTokenSignatureResult.isError) {
    logger.log("TOKEN_SIGNATURE_INVALID", {
      errorMessage: verifyTokenSignatureResult.value.errorMessage,
    });
    return unauthorizedResponseInvalidSignature;
  }

  // Fetching issuer and redirect_uri from client registry using the client_id from the incoming jwt
  const clientRegistryService = dependencies.clientRegistryService(
    config.CLIENT_REGISTRY_PARAMETER_NAME,
  );
  const getPartialRegisteredClientResponse =
    await clientRegistryService.getPartialRegisteredClientByClientId(
      jwtPayload.client_id,
    );
  if (getPartialRegisteredClientResponse.isError) {
    if (
      getPartialRegisteredClientResponse.value.errorCategory === "SERVER_ERROR"
    ) {
      logger.log("ERROR_RETRIEVING_REGISTERED_CLIENT", {
        errorMessage: getPartialRegisteredClientResponse.value.errorMessage,
      });
      return serverError500Response;
    }

    logger.log("CLIENT_CREDENTIALS_INVALID", {
      errorMessage: getPartialRegisteredClientResponse.value.errorMessage,
    });
    return badRequestResponse({
      errorDescription: "Supplied client not recognised",
      error: "invalid_client",
    });
  }

  // Validate issuer and redirect_uri against client registry
  const registeredIssuer = getPartialRegisteredClientResponse.value.issuer;
  const registeredRedirectUri =
    getPartialRegisteredClientResponse.value.redirectUri;

  if (jwtPayload.iss !== registeredIssuer) {
    logger.log("REQUEST_BODY_INVALID", {
      errorMessage: "issuer does not match value from client registry",
    });

    return badRequestResponse({
      error: "invalid_request",
      errorDescription: "Request body validation failed",
    });
  }

  if (requestBody.redirect_uri) {
    if (requestBody.redirect_uri !== registeredRedirectUri) {
      logger.log("REQUEST_BODY_INVALID", {
        errorMessage: "redirect_uri does not match value from client registry",
      });

      return badRequestResponse({
        error: "invalid_request",
        errorDescription: "Request body validation failed",
      });
    }
  }

  // Create a session
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

  if (createSessionResult.isError) {
    logger.log("ERROR_CREATING_SESSION");
    return serverError500Response;
  }
  const sessionId = createSessionResult.value;
  logger.setSessionId({ sessionId });

  // Write audit event
  const eventService = dependencies.eventService(config.SQS_QUEUE);
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
    return errorResult({
      errorMessage: "No Authentication header present",
      errorCategory: "CLIENT_ERROR",
    });
  }

  if (!authorizationHeader.startsWith("Bearer ")) {
    return errorResult({
      errorMessage:
        "Invalid authentication header format - does not start with Bearer",
      errorCategory: "CLIENT_ERROR",
    });
  }

  if (authorizationHeader.split(" ").length !== 2) {
    return errorResult({
      errorMessage: "Invalid authentication header format - contains spaces",
      errorCategory: "CLIENT_ERROR",
    });
  }

  if (authorizationHeader.split(" ")[1].length == 0) {
    return errorResult({
      errorMessage: "Invalid authentication header format - missing token",
      errorCategory: "CLIENT_ERROR",
    });
  }

  return successResult(authorizationHeader);
};

const getRequestBody = (
  requestBody: string | null,
  jwtClientId: string,
): Result<IRequestBody> => {
  if (requestBody == null) {
    return errorResult({
      errorMessage: "Missing request body",
      errorCategory: "CLIENT_ERROR",
    });
  }

  let body: IRequestBody;
  try {
    body = JSON.parse(requestBody);
  } catch {
    return errorResult({
      errorMessage: "Invalid JSON in request body",
      errorCategory: "CLIENT_ERROR",
    });
  }

  if (!body.state) {
    return errorResult({
      errorMessage: "Missing state in request body",
      errorCategory: "CLIENT_ERROR",
    });
  }

  if (!body.sub) {
    return errorResult({
      errorMessage: "Missing sub in request body",
      errorCategory: "CLIENT_ERROR",
    });
  }

  if (!body.client_id) {
    return errorResult({
      errorMessage: "Missing client_id in request body",
      errorCategory: "CLIENT_ERROR",
    });
  }

  if (body.client_id !== jwtClientId) {
    return errorResult({
      errorMessage:
        "client_id in request body does not match value in access_token",
      errorCategory: "CLIENT_ERROR",
    });
  }

  if (!body["govuk_signin_journey_id"]) {
    return errorResult({
      errorMessage: "Missing govuk_signin_journey_id in request body",
      errorCategory: "CLIENT_ERROR",
    });
  }

  if (body.redirect_uri) {
    try {
      new URL(body.redirect_uri);
    } catch {
      return errorResult({
        errorMessage: "redirect_uri in request body is not a URL",
        errorCategory: "CLIENT_ERROR",
      });
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

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);
