import { APIGatewayProxyResult } from "aws-lambda";

const securityHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

export const okResponse = (body: object): APIGatewayProxyResult => {
  return {
    headers: securityHeaders,
    statusCode: 200,
    body: JSON.stringify(body),
  };
};

export const badRequestResponse = (
  error: string,
  errorDescription: string,
): APIGatewayProxyResult => {
  return {
    headers: securityHeaders,
    statusCode: 400,
    body: JSON.stringify({
      error,
      error_description: errorDescription,
    }),
  };
};

export const unauthorizedResponse = (
  error: string,
  errorDescription: string,
): APIGatewayProxyResult => {
  return {
    headers: securityHeaders,
    statusCode: 401,
    body: JSON.stringify({
      error,
      error_description: errorDescription,
    }),
  };
};

export const notImplementedResponse: APIGatewayProxyResult = {
  headers: securityHeaders,
  statusCode: 501,
  body: JSON.stringify({ error: "Not Implemented" }),
};

export const serverErrorResponse: APIGatewayProxyResult = {
  headers: securityHeaders,
  statusCode: 500,
  body: JSON.stringify({
    error: "server_error",
    error_description: "Internal Server Error",
  }),
};

export const forbiddenResponse = (
  error: string,
  errorDescription: string,
): APIGatewayProxyResult => {
  return {
    headers: securityHeaders,
    statusCode: 403,
    body: JSON.stringify({
      error,
      error_description: errorDescription,
    }),
  };
};
