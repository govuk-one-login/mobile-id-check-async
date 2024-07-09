import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { validOrThrow } from "../config";
import {
  ClientCredentialsService,
  IClientCredentials,
} from "../services/clientCredentialsService/clientCredentialsService";
import { IGetClientCredentials } from "../asyncToken/ssmService/ssmService";
import { TokenService } from "./TokenService/tokenService";

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

  if(!isAuthorizationHeaderFormatValid(authorizationHeader)) {
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

  if (!jwtPayload.exp) {
    return badRequestResponseMissingExp;
  }

  if (jwtPayload.exp <= Math.floor(Date.now() / 1000)) {
    return badRequestResponseInvalidExp;
  }

  if (jwtPayload.iat >= Math.floor(Date.now() / 1000)) {
    return badRequestResponseInvalidIat;
  }

  if (jwtPayload.nbf >= Math.floor(Date.now() / 1000)) {
    return badRequestResponseInvalidNbf;
  }

  if (!jwtPayload.iss) {
    return badRequestResponseMissingIss;
  }

  if (jwtPayload.iss !== issuer) {
    return badRequestResponseInvalidIss;
  }

  if (!jwtPayload.scope) {
    return badRequestResponseMissingScope;
  }

  if (jwtPayload.scope !== "dcmaw.session.async_create") {
    return badRequestResponseInvalidScope;
  }

  if (!jwtPayload.client_id) {
    return badRequestResponseMissingClientId;
  }

  if (!jwtPayload.aud) {
    return badRequestResponseMissingAud;
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
    return badRequestResponseInvalidCredentials;
  }

  // Validate aud claim matches the ISSUER in client credential array
  if (jwtPayload.aud !== storedCredentials.issuer) {
    return badRequestResponseInvalidAud;
  }

  return {
    headers: { "Content-Type": "application/json" },
    statusCode: 200,
    body: JSON.stringify({
      message: "Hello World",
    }),
  };
}

const isAuthorizationHeaderFormatValid = (authorizationHeader: string) => {

  if (!authorizationHeader.startsWith("Bearer ")) {
    return unauthorizedResponse;
  }

  if (authorizationHeader.split(" ").length !== 2) {
    return unauthorizedResponse;
  }

  if (authorizationHeader.split(" ")[1].length == 0) {
    return unauthorizedResponse;
  }
}

const badRequestResponseInvalidCredentials: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 400,
  body: JSON.stringify({
    error: "invalid_client",
    error_description: "Supplied client not recognised",
  }),
};

const badRequestResponseMissingExp: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 400,
  body: JSON.stringify({
    error: "invalid_token",
    error_description: "Missing exp claim",
  }),
};

const badRequestResponseInvalidExp: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 400,
  body: JSON.stringify({
    error: "invalid_token",
    error_description: "exp claim is in the past",
  }),
};

const badRequestResponseInvalidIat: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 400,
  body: JSON.stringify({
    error: "invalid_token",
    error_description: "iat claim is in the future",
  }),
};

const badRequestResponseInvalidNbf: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 400,
  body: JSON.stringify({
    error: "invalid_token",
    error_description: "nbf claim is in the future",
  }),
};

const badRequestResponseMissingIss: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 400,
  body: JSON.stringify({
    error: "invalid_token",
    error_description: "Missing iss claim",
  }),
};

const badRequestResponseInvalidIss: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 400,
  body: JSON.stringify({
    error: "invalid_token",
    error_description: "iss claim does not match registered issuer",
  }),
};

const badRequestResponseMissingScope: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 400,
  body: JSON.stringify({
    error: "invalid_token",
    error_description: "Missing scope claim",
  }),
};

const badRequestResponseInvalidScope: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 400,
  body: JSON.stringify({
    error: "invalid_token",
    error_description: "Invalid scope claim",
  }),
};

const badRequestResponseMissingClientId: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 400,
  body: JSON.stringify({
    error: "invalid_token",
    error_description: "Missing client_id claim",
  }),
};

const badRequestResponseMissingAud: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 400,
  body: JSON.stringify({
    error: "invalid_token",
    error_description: "Missing aud claim",
  }),
};

const badRequestResponseInvalidAud: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 400,
  body: JSON.stringify({
    error: "invalid_client",
    error_description: "Invalid aud claim",
  }),
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

// const dependencies: Dependencies = {
//   tokenService: () => new TokenService(),
//   clientCredentialsService: () => new ClientCredentialsService(),
//   ssmService: () => new SsmService(),
//   env: process.env,
// };
