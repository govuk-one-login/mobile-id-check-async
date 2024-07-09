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

export async function lambdaHandler(
  event: APIGatewayProxyEvent,
  dependencies: Dependencies,
): Promise<APIGatewayProxyResult> {
  let keyId;
  try {
    keyId = validOrThrow(dependencies.env, "SIGNING_KEY_ID");
  } catch (error) {
    return serverError500Responses;
  }

  let issuer;
  try {
    issuer = validOrThrow(dependencies.env, "ISSUER");
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

  const requestBody = event.body;

  if (!requestBody) {
    return badRequestResponse({
      error: "invalid_request_body",
      errorDescription: "Missing request body",
    });
  }
  const requestBodyValidationResponse = requestBodyValidator(requestBody);

  if (requestBodyValidationResponse.isError) {
    return badRequestResponse({
      error: "invalid_request_body",
      errorDescription: requestBodyValidationResponse.value as string,
    });
  }

  const result = await tokenService.verifyTokenSignature(keyId, encodedJwt);

  if (result.isLog) {
    return unauthorizedResponseInvalidSignature;
  }

  // Fetching stored client credentials
  const ssmService = dependencies.ssmService();
  const ssmServiceResponse = await ssmService.getClientCredentials();
  if (ssmServiceResponse.isLog) {
    return serverError500Responses;
  }

  const storedCredentialsArray =
    ssmServiceResponse.value as IClientCredentials[];

  // Retrieving credentials from client credential array
  const clientCredentialsService = dependencies.clientCredentialsService();
  const storedCredentials = clientCredentialsService.getClientCredentialsById(
    storedCredentialsArray,
    jwtPayload.client_id,
  );

  if (!storedCredentials) {
    return badRequestResponse({
      error: "invalid_client",
      errorDescription: "Supplied client not recognised",
    });
  }

  // Validate aud claim matches the ISSUER in client credential array
  if (jwtPayload.aud !== storedCredentials.issuer) {
    return badRequestResponse({
      error: "invalid_client",
      errorDescription: "Invalid aud claim",
    });
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

const requestBodyValidator = (body: string): ErrorOrSuccess<null> => {
  const parsedBody = JSON.parse(body);
  if (!parsedBody.state) {
    return errorResponse("Missing state in request body");
  }

  if (!parsedBody.sub) {
    return errorResponse("Missing sub in request body");
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

export interface Dependencies {
  tokenService: () => TokenService;
  clientCredentialsService: () => ClientCredentialsService;
  ssmService: () => IGetClientCredentials;
  env: NodeJS.ProcessEnv;
}
