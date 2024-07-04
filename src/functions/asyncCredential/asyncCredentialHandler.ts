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
    return unauthorized401Response;
  }

  if (jwtPayload.exp <= Math.floor(Date.now() / 1000)) {
    console.log("DATE IN PAST");
    return unauthorized401Response;
  }

  if (jwtPayload.iat >= Math.floor(Date.now() / 1000)) {
    console.log("DATE IN PAST");
    return unauthorized401Response;
  }

  if (jwtPayload.nbf >= Math.floor(Date.now() / 1000)) {
    console.log("DATE IN PAST");
    return unauthorized401Response;
  }

  if (!jwtPayload.iss) {
    console.log("NO ISS");
    return unauthorized401Response;
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

  const result = await tokenService.verifyTokenSignature(keyId, encodedJwt);

  // Fetching stored client credentials
  const ssmService = dependencies.ssmService();
  const ssmServiceResponse = await ssmService.getClientCredentials();
  if (ssmServiceResponse.isLog) {
    return serverError500Responses;
  }

  const storedCredentialsArray =
    ssmServiceResponse.value as IClientCredentials[];

  // Incoming credentials match stored credentials
  const clientCredentialsService = dependencies.clientCredentialsService();
  const storedCredentials = clientCredentialsService.getClientCredentialsById(
    storedCredentialsArray,
    suppliedCredentials.clientId,
  );
  if (!storedCredentials) {
    return badRequestResponseInvalidCredentials;
  }

  const isValidClientCredentials = clientCredentialsService.validate(
    storedCredentials,
    suppliedCredentials,
  );
  if (!isValidClientCredentials) {
    return badRequestResponseInvalidCredentials;
  }

  if (result.isLog) {
    console.log("INVALID SIGNATURE");
    return unauthorized401Response;
  }

  return {
    headers: { "Content-Type": "application/json" },
    statusCode: 200,
    body: JSON.stringify({
      message: "Hello World",
    }),
  };
}

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
