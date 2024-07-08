import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TokenService } from "./TokenService/tokenService.test";
import { validOrThrow } from "../config";
import {
  ClientCredentialsService,
  IClientCredentials,
} from "../services/clientCredentialsService/clientCredentialsService";
import {
  IGetClientCredentials,
  SsmService,
} from "../asyncToken/ssmService/ssmService";

export async function lambdaHandler(
  event: APIGatewayProxyEvent,
  dependencies: Dependencies,
): Promise<APIGatewayProxyResult> {
  console.log("REQUEST INCOMING");
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

  const bearerToken = event.headers["Authorization"];

  if (bearerToken == null) {
    return unauthorized401Response;
  }

  if (!bearerToken.startsWith("Bearer ")) {
    return unauthorized401Response;
  }

  if (bearerToken.split(" ").length !== 2) {
    return unauthorized401Response;
  }

  if (bearerToken.split(" ")[1].length == 0) {
    return unauthorized401Response;
  }

  const tokenService = dependencies.tokenService();

  // JWT Claim validation
  const encodedJwt = bearerToken.split(" ")[1];

  const [header, payload, signature] = encodedJwt.split(".");
  const jwtPayload = JSON.parse(
    Buffer.from(payload, "base64").toString("utf-8"),
  );

  if (!jwtPayload.exp) {
    console.log("NO EXP");
    return badRequestResponseMissingExp;
  }

  if (jwtPayload.exp <= Math.floor(Date.now() / 1000)) {
    console.log("DATE IN PAST");
    return badRequestResponseInvalidExp;
  }

  if (jwtPayload.iat >= Math.floor(Date.now() / 1000)) {
    console.log("DATE IN PAST");
    return badRequestResponseInvalidIat;
  }

  if (jwtPayload.nbf >= Math.floor(Date.now() / 1000)) {
    console.log("DATE IN PAST");
    return badRequestResponseInvalidNbf;
  }

  if (!jwtPayload.iss) {
    console.log("NO ISS");
    return badRequestResponseMissingIss;
  }

  if (jwtPayload.iss !== issuer) {
    console.log("ISS INVALID");
    return unauthorized401Response;
  }

  if (!jwtPayload.scope) {
    console.log("NO SCOPE");
    return unauthorized401Response;
  }

  if (jwtPayload.scope !== "dcmaw.session.async_create") {
    console.log("SCOPE INVALID");
    return unauthorized401Response;
  }

  if (!jwtPayload.client_id) {
    console.log("NO CLIENT_ID");
    return unauthorized401Response;
  }

  if (!jwtPayload.aud) {
    console.log("NO AUD");
    return unauthorized401Response;
  }

  const result = await tokenService.verifyTokenSignature(keyId, encodedJwt);

  if (result.isLog) {
    console.log("INVALID SIGNATURE", encodedJwt);
    return unauthorized401Response;
  }

  // Fetching stored client credentials
  const ssmService = dependencies.ssmService();
  const ssmServiceResponse = await ssmService.getClientCredentials();
  if (ssmServiceResponse.isLog) {
    console.log("'it's an error!!!!!!!!!");
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
    error: "bad_request",
    error_description: "Missing exp claim",
  }),
};

const badRequestResponseInvalidExp: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 400,
  body: JSON.stringify({
    error: "bad_request",
    error_description: "exp claim is in the past",
  }),
};

const badRequestResponseInvalidIat: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 400,
  body: JSON.stringify({
    error: "bad_request",
    error_description: "iat claim is in the future",
  }),
};

const badRequestResponseInvalidNbf: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 400,
  body: JSON.stringify({
    error: "bad_request",
    error_description: "nbf claim is in the future",
  }),
};

const badRequestResponseMissingIss: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 400,
  body: JSON.stringify({
    error: "bad_request",
    error_description: "Missing iss claim",
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

const unauthorized401Response = {
  headers: { "Content-Type": "application/json" },
  statusCode: 401,
  body: "Unauthorized",
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

const dependencies = {
  tokenService: () => new TokenService(),
};
