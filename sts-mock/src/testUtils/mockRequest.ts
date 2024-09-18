import { APIGatewayEventIdentity, APIGatewayProxyEvent } from "aws-lambda";

export function buildTokenRequest(requestBody?: string): APIGatewayProxyEvent {
  const body = requestBody ?? "defaultBody";

  return {
    httpMethod: "post",
    body,
    pathParameters: {},
    queryStringParameters: {},
    requestContext: {
      accountId: "123456789012",
      apiId: "1234",
      authorizer: {},
      httpMethod: "post",
      identity: {} as APIGatewayEventIdentity,
      path: "",
      protocol: "HTTP/1.1",
      requestId: "c6af9ac6-7b61-11e6-9a41-93e8deadbeef",
      requestTimeEpoch: 1428582896000,
      resourceId: "123456",
      resourcePath: "",
      stage: "dev",
    },
  } as APIGatewayProxyEvent;
}
