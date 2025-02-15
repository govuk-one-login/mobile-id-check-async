import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { IDecodedToken } from "./tokenService/tokenService";
import { ConfigService } from "./configService/configService";
import {
  IAsyncCredentialDependencies,
  dependencies,
} from "./handlerDependencies";
import { RequestService } from "./requestService/requestService";
import { ErrorCategory } from "../utils/result";

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
    return serverErrorResponse;
  }
  const config = configResult.value;

  const requestService = new RequestService();

  const authorizationHeaderResult = requestService.getAuthorizationHeader(
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
  const requestBodyResult = requestService.getRequestBody(
    event.body,
    jwtPayload.client_id,
  );
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
    const errorMessage = verifyTokenSignatureResult.value.errorMessage;
    logger.log("ERROR_VERIFYING_SIGNATURE", {
      errorMessage,
    });
    return badRequestResponse({
      error: "invalid_request",
      errorDescription: "Invalid signature",
    });
  }

  // Fetching issuer and redirect_uri from client registry using the client_id from the incoming jwt
  const clientRegistryService = dependencies.clientRegistryService(
    config.CLIENT_REGISTRY_SECRET_NAME,
  );
  const getPartialRegisteredClientResponse =
    await clientRegistryService.getPartialRegisteredClientByClientId(
      jwtPayload.client_id,
    );
  if (getPartialRegisteredClientResponse.isError) {
    if (
      getPartialRegisteredClientResponse.value.errorCategory ===
      ErrorCategory.SERVER_ERROR
    ) {
      logger.log("ERROR_RETRIEVING_REGISTERED_CLIENT", {
        errorMessage: getPartialRegisteredClientResponse.value.errorMessage,
      });
      return serverErrorResponse;
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

  const sessionService = dependencies.sessionService(config.SESSION_TABLE_NAME);

  const getActiveSessionIdResult = await sessionService.getActiveSessionId(
    requestBody.sub,
  );
  if (getActiveSessionIdResult.isError) {
    logger.log("ERROR_RETRIEVING_SESSION", {
      errorMessage: getActiveSessionIdResult.value.errorMessage,
    });
    return serverErrorResponse;
  }
  if (getActiveSessionIdResult.value) {
    logger.setSessionId({ sessionId: getActiveSessionIdResult.value });
    logger.log("COMPLETED");
    return activeSessionFoundResponse(requestBody.sub);
  }

  const createSessionResult = await sessionService.createSession({
    ...requestBody,
    issuer: jwtPayload.iss,
    sessionDurationInSeconds: config.SESSION_DURATION_IN_SECONDS,
  });

  if (createSessionResult.isError) {
    logger.log("ERROR_CREATING_SESSION", {
      errorMessage: createSessionResult.value.errorMessage,
    });
    return serverErrorResponse;
  }
  const sessionId = createSessionResult.value;
  logger.setSessionId({ sessionId });

  // Write audit event
  const eventService = dependencies.eventService(config.TXMA_SQS);
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
    return serverErrorResponse;
  }

  logger.log("COMPLETED");
  return sessionCreatedResponse(requestBody.sub);
}

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
    error: "invalid_token",
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
