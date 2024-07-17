import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { validOrThrow } from "../config";
import {
  ClientCredentialsService,
  IClientCredentials,
} from "../services/clientCredentialsService/clientCredentialsService";
import { IGetClientCredentials } from "../asyncToken/ssmService/ssmService";
import { TokenService } from "./TokenService/tokenService";
import {
  ErrorOrSuccess,
  errorResponse,
  successResponse,
} from "../types/errorOrValue";
import { IJwtPayload } from "../types/jwt";
import { IRecoverAuthSession } from "./sessionService/sessionService";

export async function lambdaHandler(
  event: APIGatewayProxyEvent,
  dependencies: Dependencies,
): Promise<APIGatewayProxyResult> {
  let keyId;
  let issuer;
  let sessionTableName;
  let sessionTableSubIndexName;
  let sessionRecoveryTimeout;
  try {
    keyId = validOrThrow(dependencies.env, "SIGNING_KEY_ID");
    issuer = validOrThrow(dependencies.env, "ISSUER");
    sessionTableName = validOrThrow(dependencies.env, "SESSION_TABLE_NAME");
    sessionTableSubIndexName = validOrThrow(
      dependencies.env,
      "SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME",
    );
    sessionRecoveryTimeout = parseInt(
      validOrThrow(dependencies.env, "SESSION_RECOVERY_TIMEOUT"),
    );

    if (!sessionRecoveryTimeout) {
      throw new Error("Invalid SESSION_RECOVERY_TIMEOUT value - not a number");
    }
  } catch (error) {
    return serverError500Responses;
  }

  const authorizationHeader = event.headers["Authorization"];

  if (authorizationHeader == null) {
    return unauthorizedResponse;
  }

  if (!isAuthorizationHeaderFormatValid(authorizationHeader)) {
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

  const jwtClaimValidationResponse = jwtClaimValidator(jwtPayload, issuer);
  if (jwtClaimValidationResponse.isError) {
    return badRequestResponse({
      error: "invalid_token",
      errorDescription: jwtClaimValidationResponse.value as string,
    });
  }

  if (event.body == null) {
    return badRequestResponse({
      error: "invalid_request",
      errorDescription: "Missing request body",
    });
  }

  let parsedRequestBody: ICredentialRequestBody;
  try {
    parsedRequestBody = JSON.parse(event.body);
  } catch (error) {
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
    return badRequestResponse({
      error: "invalid_request",
      errorDescription: requestBodyValidationResponse.value as string,
    });
  }

  const result = await tokenService.verifyTokenSignature(keyId, encodedJwt);

  if (result.isError) {
    return unauthorizedResponseInvalidSignature;
  }

  // Fetching stored client credentials
  const ssmService = dependencies.ssmService();
  const ssmServiceResponse = await ssmService.getClientCredentials();
  if (ssmServiceResponse.isError) {
    return serverError500Responses;
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
      clientCredentialsService.validateCredentialRequest(
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

  const recoverSessionService = dependencies.getRecoverSessionService(
    sessionTableName,
    sessionTableSubIndexName,
  );

  const recoverSessionServiceResponse =
    await recoverSessionService.getAuthSessionBySub(
      parsedRequestBody.sub,
      parsedRequestBody.state,
      sessionRecoveryTimeout,
    );
  if (recoverSessionServiceResponse.isError) {
    return serverError500Responses;
  }

  if (recoverSessionServiceResponse.value) {
    return sessionRecoveredResponse(parsedRequestBody.sub);
  }

  return {
    headers: { "Content-Type": "application/json" },
    statusCode: 200,
    body: JSON.stringify({
      message: "Hello World",
    }),
  };
}

const isAuthorizationHeaderFormatValid = (
  authorizationHeader: string,
): boolean => {
  if (!authorizationHeader.startsWith("Bearer ")) {
    return false;
  }

  if (authorizationHeader.split(" ").length !== 2) {
    return false;
  }

  if (authorizationHeader.split(" ")[1].length == 0) {
    return false;
  }

  return true;
};

const jwtClaimValidator = (
  jwtPayload: IJwtPayload,
  issuer: string,
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

  if (jwtPayload.iss !== issuer) {
    return errorResponse("iss claim does not match registered issuer");
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
      "client_id in request body does not match client_id in access token",
    );
  }

  if (!requestBody["govuk_signin_journey_id"]) {
    return errorResponse("Missing govuk_signin_journey_id in request body");
  }

  if (requestBody.redirect_uri) {
    try {
      new URL(requestBody.redirect_uri);
    } catch (error) {
      return errorResponse("Invalid redirect_uri");
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

const serverError500Responses: APIGatewayProxyResult = {
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

export interface ICredentialRequestBody {
  sub: string;
  govuk_signin_journey_id: string;
  client_id: string;
  state: string;
  redirect_uri?: string;
}

export interface Dependencies {
  tokenService: () => TokenService;
  clientCredentialsService: () => ClientCredentialsService;
  ssmService: () => IGetClientCredentials;
  getRecoverSessionService: (
    tableName: string,
    indexName: string,
  ) => IRecoverAuthSession;
  env: NodeJS.ProcessEnv;
}
