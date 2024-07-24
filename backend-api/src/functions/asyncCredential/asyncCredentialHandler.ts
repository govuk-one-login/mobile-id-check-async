import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  ClientCredentialsService,
  IClientCredentials,
} from "../services/clientCredentialsService/clientCredentialsService";
import {
  IVerifyTokenClaims,
  IVerifyTokenSignature,
} from "./TokenService/tokenService";
import {
  ErrorOrSuccess,
  errorResponse,
  successResponse,
} from "../types/errorOrValue";
import {
  ICreateSession,
  IGetActiveSession,
} from "./sessionService/sessionService";
import { randomUUID } from "crypto";
import { Logger } from "../services/logging/logger";
import { MessageName } from "./registeredLogs";
import { IGetClientCredentials } from "../asyncToken/ssmService/ssmService";
import { IEventService } from "../services/events/eventService";

export async function lambdaHandler(
  event: APIGatewayProxyEvent,
  dependencies: Dependencies,
): Promise<APIGatewayProxyResult> {
  const logger = dependencies.logger();
  const configResponse = configOrError(dependencies.env);

  if (configResponse.isError) {
    logger.log("ENVIRONMENT_VARIABLE_MISSING", {
      errorMessage: configResponse.value,
    });
    return serverError500Response;
  }

  const config = configResponse.value as Config;

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
  const encodedJwt = authorizationHeader.split(" ")[1];
  const payload = encodedJwt.split(".")[1];
  const jwtPayload = JSON.parse(
    Buffer.from(payload, "base64").toString("utf-8"),
  );

  // JWT Claim validation
  const tokenService = dependencies.tokenService();
  const validTokenClaimsOrError = tokenService.verifyTokenClaims(
    jwtPayload,
    config.ISSUER,
  );
  if (validTokenClaimsOrError.isError) {
    logger.log("JWT_CLAIM_INVALID", {
      errorMessage: validTokenClaimsOrError.value,
    });
    return badRequestResponse({
      error: "invalid_token",
      errorDescription: validTokenClaimsOrError.value as string,
    });
  }

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

  const requestBody = requestBodyOrError.value as IRequestBody;

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
  const ssmService = dependencies.ssmService();
  const ssmServiceResponse = await ssmService.getClientCredentials();
  if (ssmServiceResponse.isError) {
    logger.log("ERROR_RETRIEVING_CLIENT_CREDENTIALS", {
      errorMessage: ssmServiceResponse.value,
    });
    return serverError500Response;
  }

  const storedCredentialsArray =
    ssmServiceResponse.value as IClientCredentials[];

  // Retrieving credentials from client credential array
  const clientCredentialsService = dependencies.clientCredentialsService();
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

  const clientCredentials =
    clientCredentialResponse.value as IClientCredentials;

  if (requestBody.redirect_uri) {
    const validateClientCredentialsResult =
      clientCredentialsService.validateRedirectUri(
        clientCredentials,
        requestBody,
      );
    if (validateClientCredentialsResult.isError) {
      logger.log("REQUEST_BODY_INVALID", {
        errorMessage: validateClientCredentialsResult.value,
      });

      return badRequestResponse({
        error: "invalid_request",
        errorDescription: validateClientCredentialsResult.value as string,
      });
    }
  }

  // Validate aud claim matches the ISSUER in client credential array
  if (jwtPayload.aud !== clientCredentials.issuer) {
    logger.log("JWT_CLAIM_INVALID", {
      errorMessage: "Invalid aud claim",
    });

    return badRequestResponse({
      error: "invalid_client",
      errorDescription: "Invalid aud claim",
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

  const { sub, client_id, govuk_signin_journey_id, redirect_uri, state } =
    requestBody;
  const { iss } = jwtPayload;

  const sessionId = randomUUID();

  const sessionConfig = {
    sessionId,
    state,
    sub,
    clientId: client_id,
    govukSigninJourneyId: govuk_signin_journey_id,
    redirectUri: redirect_uri,
    issuer: iss,
    issuedOn: Date.now().toString(),
    sessionState: "ASYNC_AUTH_SESSION_CREATED",
  };

  const sessionServiceCreateSessionResult =
    await sessionService.createSession(sessionConfig);

  const eventService = dependencies.eventService(config.SQS_QUEUE);

  if (sessionServiceCreateSessionResult.isError) {
    logger.log("ERROR_CREATING_SESSION");
    return serverError500Response;
  }

  logger.setSessionId({ sessionId });

  const writeEventResult = await eventService.writeEvent({
    eventName: "DCMAW_ASYNC_CRI_START",
    sub,
    sessionId,
    govukSigninJourneyId: govuk_signin_journey_id,
    getNowInMilliseconds: Date.now,
    componentId: config.ISSUER,
  });

  if (writeEventResult.isError) {
    logger.log("ERROR_WRITING_AUDIT_EVENT", {
      errorMessage: "Unexpected error writing the DCMAW_ASYNC_CRI_START event",
    });
  }

  logger.log("COMPLETED");
  return sessionCreatedResponse(requestBody.sub);
}

interface Config {
  SIGNING_KEY_ID: string;
  ISSUER: string;
  SESSION_TABLE_NAME: string;
  SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME: string;
  SESSION_TTL_IN_MILLISECONDS: number;
  SQS_QUEUE: string;
}

const configOrError = (env: NodeJS.ProcessEnv): ErrorOrSuccess<Config> => {
  if (!env.SIGNING_KEY_ID) return errorResponse("No SIGNING_KEY_ID");
  if (!env.ISSUER) return errorResponse("No ISSUER");
  if (!env.SESSION_TABLE_NAME) return errorResponse("No SESSION_TABLE_NAME");
  if (!env.SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME)
    return errorResponse("No SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME");
  if (!env.SESSION_TTL_IN_MILLISECONDS)
    return errorResponse("No SESSION_TTL_IN_MILLISECONDS");
  if (isNaN(Number(env.SESSION_TTL_IN_MILLISECONDS)))
    return errorResponse("SESSION_TTL_IN_MILLISECONDS is not a valid number");
  if (!env.SQS_QUEUE) return errorResponse("No SQS_QUEUE");
  return successResponse({
    SIGNING_KEY_ID: env.SIGNING_KEY_ID,
    ISSUER: env.ISSUER,
    SESSION_TABLE_NAME: env.SESSION_TABLE_NAME,
    SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME:
      env.SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME,
    SESSION_TTL_IN_MILLISECONDS: parseInt(env.SESSION_TTL_IN_MILLISECONDS),
    SQS_QUEUE: env.SQS_QUEUE,
  });
};

const getAuthorizationHeader = (
  authorizationHeader: string | undefined,
): ErrorOrSuccess<string> => {
  if (authorizationHeader == null) {
    return errorResponse("No Authentication header present");
  }

  if (!authorizationHeader.startsWith("Bearer ")) {
    return errorResponse(
      "Invalid authentication header format - does not start with Bearer",
    );
  }

  if (authorizationHeader.split(" ").length !== 2) {
    return errorResponse(
      "Invalid authentication header format - contains spaces",
    );
  }

  if (authorizationHeader.split(" ")[1].length == 0) {
    return errorResponse(
      "Invalid authentication header format - missing token",
    );
  }

  return successResponse(authorizationHeader);
};

const getRequestBody = (
  requestBody: string | null,
  jwtClientId: string,
): ErrorOrSuccess<IRequestBody> => {
  if (requestBody == null) {
    return errorResponse("Missing request body");
  }

  let body: IRequestBody;
  try {
    body = JSON.parse(requestBody);
  } catch (error) {
    return errorResponse("Invalid JSON in request body");
  }

  if (!body.state) {
    return errorResponse("Missing state in request body");
  }

  if (!body.sub) {
    return errorResponse("Missing sub in request body");
  }

  if (!body.client_id) {
    return errorResponse("Missing client_id in request body");
  }

  if (body.client_id !== jwtClientId) {
    return errorResponse(
      "client_id in request body does not match value in access_token",
    );
  }

  if (!body["govuk_signin_journey_id"]) {
    return errorResponse("Missing govuk_signin_journey_id in request body");
  }

  if (body.redirect_uri) {
    try {
      new URL(body.redirect_uri);
    } catch (error) {
      return errorResponse("redirect_uri in request body is not a URL");
    }
  }

  return successResponse(body);
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
  tokenService: () => IVerifyTokenClaims & IVerifyTokenSignature;
  clientCredentialsService: () => ClientCredentialsService;
  ssmService: () => IGetClientCredentials;
  sessionService: (
    tableName: string,
    indexName: string,
  ) => IGetActiveSession & ICreateSession;
  env: NodeJS.ProcessEnv;
}
