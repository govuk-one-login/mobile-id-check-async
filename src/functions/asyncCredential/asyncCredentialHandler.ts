import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TokenService } from "./TokenService/tokenService.test";

export async function lambdaHandler(
  event: APIGatewayProxyEvent,
  dependencies: Dependencies,
): Promise<APIGatewayProxyResult> {
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

  if (!jwtPayload.iat) {
    console.log("NO IAT");
    return unauthorized401Response;
  }

  const result = await tokenService.verifyTokenSignature("keyId", encodedJwt);

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

export interface Dependencies {
  tokenService: () => TokenService;
}

const dependencies = {
  tokenService: () => new TokenService(),
};
