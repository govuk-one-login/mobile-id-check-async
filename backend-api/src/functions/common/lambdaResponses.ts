import { APIGatewayProxyResult } from "aws-lambda";

const securityHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
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
