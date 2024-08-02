import { APIGatewayProxyEvent } from "aws-lambda";

// eslint-disable-next-line
export function buildRequest(overrides?: any): APIGatewayProxyEvent {
  const defaultRequest = {
    httpMethod: "get",
    body: "",
    headers: {
      "x-correlation-id": "correlationId",
    },
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: {},
    path: "/hello",
    pathParameters: {},
    queryStringParameters: {},
    requestContext: {
      accountId: "123456789012",
      apiId: "1234",
      authorizer: {},
      httpMethod: "get",
      identity: { sourceIp: "1.1.1.1" },
      path: "/hello",
      protocol: "HTTP/1.1",
      requestId: "c6af9ac6-7b61-11e6-9a41-93e8deadbeef",
      requestTimeEpoch: 1428582896000,
      resourceId: "123456",
      resourcePath: "/hello",
      stage: "dev",
    },
    resource: "",
    stageVariables: {},
  };
  return { ...defaultRequest, ...overrides };
}

// base64encoded mockClientId:mockClientSecret" -> synthetic test data - not a secret
export const buildTokenHandlerRequest = (requestParams: {
  body: string | null;
  authorizationHeader: string | null;
}): APIGatewayProxyEvent => {
  return buildRequest({
    body: requestParams.body,
    headers: { Authorization: requestParams.authorizationHeader },
  });
};
