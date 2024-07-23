import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  ClientCredentialsService,
  IClientCredentials,
} from "../services/clientCredentialsService/clientCredentialsService";
import { TokenService } from "./TokenService/tokenService";
import {
  ErrorOrSuccess,
  errorResponse,
  successResponse,
} from "../types/errorOrValue";
import { IJwtPayload } from "../types/jwt";
import {
  ICreateSession,
  IGetSessionBySub,
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

  const authorizationHeader = event.headers["Authorization"];

  if (authorizationHeader == null) {
    logger.log("AUTHENTICATION_HEADER_INVALID", {
      errorMessage: "No Authentication header present",
    });
    return unauthorizedResponse;
  }

  const validAuthorizationHeaderOrErrorResponse =
    validAuthorizationHeaderOrError(authorizationHeader);
  if (validAuthorizationHeaderOrErrorResponse.isError) {
    logger.log("AUTHENTICATION_HEADER_INVALID", {
      errorMessage: validAuthorizationHeaderOrErrorResponse.value,
    });
    return unauthorizedResponse;
  }

  const tokenService = dependencies.tokenService();

  // JWT Claim validation
  const encodedJwt = authorizationHeader.split(" ")[1];

  // Replace with const [header, payload, signature] = encodedJwt.split(".") when needed
  const payload = encodedJwt.split(".")[1];
  const jwtPayload = JSON.parse(
    Buffer.from(payload, "base64").toString("utf-8"),
  );

  const jwtClaimValidationResponse = jwtClaimValidator(
    jwtPayload,
    config.ISSUER,
  );

  if (jwtClaimValidationResponse.isError) {
    logger.log("JWT_CLAIM_INVALID", {
      errorMessage: jwtClaimValidationResponse.value,
    });
    return badRequestResponse({
      error: "invalid_token",
      errorDescription: jwtClaimValidationResponse.value as string,
    });
  }

  if (event.body == null) {
    logger.log("REQUEST_BODY_INVALID", {
      errorMessage: "Missing request body",
    });
    return badRequestResponse({
      error: "invalid_request",
      errorDescription: "Missing request body",
    });
  }

  let parsedRequestBody: ICredentialRequestBody;
  try {
    parsedRequestBody = JSON.parse(event.body);
  } catch (error) {
    logger.log("REQUEST_BODY_INVALID", {
      errorMessage: "Invalid JSON in request body",
    });
    return badRequestResponse({
      error: "invalid_request",
      errorDescription: "Invalid JSON in request body",
    });
  }

  const requestBodyValidationResponse = requestBodyValidator(
    parsedRequestBody,
    jwtPayload.client_id,
  );

  if (requestBodyValidationResponse.isError) {
    logger.log("REQUEST_BODY_INVALID", {
      errorMessage: requestBodyValidationResponse.value,
    });
    return badRequestResponse({
      error: "invalid_request",
      errorDescription: "Request body validation failed",
    });
  }

  const result = await tokenService.verifyTokenSignature(
    config.SIGNING_KEY_ID,
    encodedJwt,
  );

  if (result.isError) {
    console.log("MESSAGE NAME: ", result.value);
    logger.log("TOKEN_SIGNATURE_INVALID", {
      errorMessage: result.value,
    });
    return unauthorizedResponseInvalidSignature;
  }

  // Fetching stored client credentials
  const ssmService = dependencies.ssmService();
  const ssmServiceResponse = await ssmService.getClientCredentials();
  if (ssmServiceResponse.isError) {
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
    return badRequestResponse({
      error: "invalid_client",
      errorDescription: "Supplied client not recognised",
    });
  }

  const clientCredentials =
    clientCredentialResponse.value as IClientCredentials;

  if (parsedRequestBody.redirect_uri) {
    const validateClientCredentialsResult =
      clientCredentialsService.validateRedirectUri(
        clientCredentials,
        parsedRequestBody,
      );
    if (validateClientCredentialsResult.isError) {
      return badRequestResponse({
        error: "invalid_request",
        errorDescription: validateClientCredentialsResult.value as string,
      });
    }
  }

  // Validate aud claim matches the ISSUER in client credential array
  if (jwtPayload.aud !== clientCredentials.issuer) {
    return badRequestResponse({
      error: "invalid_client",
      errorDescription: "Invalid aud claim",
    });
  }

  const sessionService = dependencies.getSessionService(
    config.SESSION_TABLE_NAME,
    config.SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME,
  );

  const recoverSessionServiceResponse =
    await sessionService.getAuthSessionBySub(
      parsedRequestBody.sub,
      parsedRequestBody.state,
      config.SESSION_RECOVERY_TIMEOUT,
    );
  if (recoverSessionServiceResponse.isError) {
    return serverError500Response;
  }

  if (recoverSessionServiceResponse.value) {
    return sessionRecoveredResponse(parsedRequestBody.sub);
  }

  const { sub, client_id, govuk_signin_journey_id, redirect_uri, state } =
    parsedRequestBody;
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
    sessionState: "ASYNC_AUTH_SESSION_CREATED",
  };

  const sessionServiceCreateSessionResult =
    await sessionService.createSession(sessionConfig);

  const eventService = dependencies.eventService(config.SQS_QUEUE);

  if (sessionServiceCreateSessionResult.isError) {
    logger.log("ERROR_CREATING_SESSION");
    return serverError500Response;
  }

  const writeEventResult = await eventService.writeEvent({
    eventName: "DCMAW_ASYNC_CRI_START",
    sub,
    sessionId,
    govukSigninJourneyId: govuk_signin_journey_id,
    clientId: client_id,
    getNowInMilliseconds: Date.now,
    componentId: config.ISSUER,
  });

  if (writeEventResult.isError) {
    logger.log("ERROR_WRITING_AUDIT_EVENT", {
      errorMessage: "Unexpected error writing the DCMAW_ASYNC_CRI_START event",
    });
  }

  logger.log("SESSION_CREATED");
  return sessionCreatedResponse(parsedRequestBody.sub);
}

interface Config {
  SIGNING_KEY_ID: string;
  ISSUER: string;
  SESSION_TABLE_NAME: string;
  SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME: string;
  SESSION_RECOVERY_TIMEOUT: number;
  SQS_QUEUE: string;
}

const configOrError = (env: NodeJS.ProcessEnv): ErrorOrSuccess<Config> => {
  if (!env.SIGNING_KEY_ID) return errorResponse("No SIGNING_KEY_ID");
  if (!env.ISSUER) return errorResponse("No ISSUER");
  if (!env.SESSION_TABLE_NAME) return errorResponse("No SESSION_TABLE_NAME");
  if (!env.SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME)
    return errorResponse("No SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME");
  if (!env.SESSION_RECOVERY_TIMEOUT)
    return errorResponse("No SESSION_RECOVERY_TIMEOUT");
  if (isNaN(Number(env.SESSION_RECOVERY_TIMEOUT)))
    return errorResponse("SESSION_RECOVERY_TIMEOUT is not a valid number");
  if (!env.SQS_QUEUE) return errorResponse("No SQS_QUEUE");
  return successResponse({
    SIGNING_KEY_ID: env.SIGNING_KEY_ID,
    ISSUER: env.ISSUER,
    SESSION_TABLE_NAME: env.SESSION_TABLE_NAME,
    SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME:
      env.SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME,
    SESSION_RECOVERY_TIMEOUT: parseInt(env.SESSION_RECOVERY_TIMEOUT),
    SQS_QUEUE: env.SQS_QUEUE,
  });
};

const validAuthorizationHeaderOrError = (
  authorizationHeader: string,
): ErrorOrSuccess<null> => {
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

  return successResponse(null);
};

const jwtClaimValidator = (
  jwtPayload: IJwtPayload,
  issuerEnvironmentVariable: string,
): ErrorOrSuccess<null> => {
  if (!jwtPayload.exp) {
    return errorResponse("Missing exp claim");
  }

  if (jwtPayload.exp <= Math.floor(Date.now() / 1000)) {
    return errorResponse("exp claim is in the past");
  }
  if (jwtPayload.iat) {
    if (jwtPayload.iat >= Math.floor(Date.now() / 1000)) {
      return errorResponse("iat claim is in the future");
    }
  }

  if (jwtPayload.nbf) {
    if (jwtPayload.nbf >= Math.floor(Date.now() / 1000)) {
      return errorResponse("nbf claim is in the future");
    }
  }

  if (!jwtPayload.iss) {
    return errorResponse("Missing iss claim");
  }

  if (jwtPayload.iss !== issuerEnvironmentVariable) {
    return errorResponse(
      "iss claim does not match ISSUER environment variable",
    );
  }

  if (!jwtPayload.scope) {
    return errorResponse("Missing scope claim");
  }

  if (jwtPayload.scope !== "dcmaw.session.async_create") {
    return errorResponse("Invalid scope claim");
  }

  if (!jwtPayload.client_id) {
    return errorResponse("Missing client_id claim");
  }

  if (!jwtPayload.aud) {
    return errorResponse("Missing aud claim");
  }

  return successResponse(null);
};

const requestBodyValidator = (
  requestBody: ICredentialRequestBody,
  jwtClientId: string,
): ErrorOrSuccess<null> => {
  if (!requestBody.state) {
    return errorResponse("Missing state in request body");
  }

  if (!requestBody.sub) {
    return errorResponse("Missing sub in request body");
  }

  if (!requestBody.client_id) {
    return errorResponse("Missing client_id in request body");
  }

  if (requestBody.client_id !== jwtClientId) {
    return errorResponse(
      "client_id in request body does not match value in access_token",
    );
  }

  if (!requestBody["govuk_signin_journey_id"]) {
    return errorResponse("Missing govuk_signin_journey_id in request body");
  }

  if (requestBody.redirect_uri) {
    try {
      new URL(requestBody.redirect_uri);
    } catch (error) {
      return errorResponse("redirect_uri in request body is not a URL");
    }
  }

  return successResponse(null);
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

const sessionRecoveredResponse = (sub: string): APIGatewayProxyResult => {
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

export interface ICredentialRequestBody {
  sub: string;
  govuk_signin_journey_id: string;
  client_id: string;
  state: string;
  redirect_uri?: string;
}

export interface Dependencies {
  logger: () => Logger<MessageName>;
  eventService: (sqsQueue: string) => IEventService;
  tokenService: () => TokenService;
  clientCredentialsService: () => ClientCredentialsService;
  ssmService: () => IGetClientCredentials;
  getSessionService: (
    tableName: string,
    indexName: string,
  ) => IGetSessionBySub & ICreateSession;
  env: NodeJS.ProcessEnv;
}
