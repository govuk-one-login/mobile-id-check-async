import { APIGatewayProxyResult } from "aws-lambda";

export const badRequestResponse = (
  error: string,
  errorDescription: string,
): APIGatewayProxyResult => {
  return {
    headers: { "Content-Type": "application/json" },
    statusCode: 400,
    body: JSON.stringify({
      error,
      error_description: errorDescription,
    }),
  };
};

export const notImplementedResponse: APIGatewayProxyResult = {
  headers: {
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
    "Strict-Transport-Security": "max-age=31536000",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  },
  statusCode: 501,
  body: JSON.stringify({ error: "Not Implemented" }),
};
