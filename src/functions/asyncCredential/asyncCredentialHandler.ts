import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TokenService } from "./TokenService/tokenService.test";

export async function lambdaHandler(
  event: APIGatewayProxyEvent,
  dependencies: Dependencies,
): Promise<APIGatewayProxyResult> {
  const bearerToken = event.headers["Authorization"];

  if (bearerToken == null) {
    return {
      headers: { "Content-Type": "application/json" },
      statusCode: 401,
      body: "Unauthorized",
    };
  }

  if (!bearerToken.startsWith("Bearer ")) {
    return {
      headers: { "Content-Type": "application/json" },
      statusCode: 401,
      body: "Unauthorized",
    };
  }

  if (bearerToken.split(" ").length !== 2) {
    return {
      headers: { "Content-Type": "application/json" },
      statusCode: 401,
      body: "Unauthorized",
    };
  }

  if (bearerToken.split(" ")[1].length == 0) {
    return {
      headers: { "Content-Type": "application/json" },
      statusCode: 401,
      body: "Unauthorized",
    };
  }

  const tokenService = dependencies.tokenService();

  // JWT Claim validation
  const encodedJwt = bearerToken.split(" ")[1];
  console.log("ENCODED JWT", encodedJwt);
  const [header, payload, signature] = encodedJwt.split(".");
  const jwtPayload = JSON.parse(
    Buffer.from(payload, "base64").toString("utf-8"),
  );
  console.log("JWT PAYLOAD", jwtPayload);

  if (!jwtPayload.exp) {
    return {
      headers: { "Content-Type": "application/json" },
      statusCode: 401,
      body: "Unauthorized",
    };
  }

  const result = await tokenService.verifyTokenSignature("keyId", encodedJwt);

  if (result.isLog) {
    return {
      headers: { "Content-Type": "application/json" },
      statusCode: 401,
      body: "Unauthorized",
    };
  }

  return {
    headers: { "Content-Type": "application/json" },
    statusCode: 200,
    body: JSON.stringify({
      message: "Hello World",
    }),
  };
}

export interface Dependencies {
  tokenService: () => TokenService;
}

const dependencies = {
  tokenService: () => new TokenService(),
};
