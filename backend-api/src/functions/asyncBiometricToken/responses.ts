import { APIGatewayProxyResult } from "aws-lambda";

export const notImplementedResponse: APIGatewayProxyResult = {
  headers: {
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
    "Strict-Transport-Security": "max-age=31536000",
    "X-Content-Type-Options": " nosniff",
    "X-Frame-Options": "DENY",
  },
  statusCode: 501,
  body: JSON.stringify({ error: "Not Implemented" }),
};
