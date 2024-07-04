import { APIGatewayProxyEvent } from "aws-lambda";
import { LogOrValue, log, value } from "../types/logOrValue";
import {
  IAsyncTokenRequestDependencies,
  lambdaHandlerConstructor,
} from "./asyncTokenHandler";
import {
  IClientCredentials,
  IClientCredentialsService,
} from "./clientCredentialsService/clientCredentialsService";
import {
  IDecodedAuthorizationHeader,
  IProcessRequest,
} from "./requestService/requestService";
import { IGetClientCredentials } from "./ssmService/ssmService";
import { IMintToken } from "./tokenService/tokenService";

describe("Async Token", () => {
  let request: APIGatewayProxyEvent;
  let dependencies: IAsyncTokenRequestDependencies;

  beforeEach(() => {
    request = buildRequest();
    dependencies = {
      env,
      getRequestService: () => new MockRequestServiceValueResponse(),
      getSsmService: () => new MockPassingSsmService(),
      getClientCredentialsService: () =>
        new MockPassingClientCredentialsService(),
      getTokenService: () => new MockPassingTokenService(),
    };
  });

  describe("Environment variable validation", () => {
    describe("Given SIGNING_KEY_IDS is missing", () => {
      it("Returns a 500 Server Error response", async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        delete dependencies.env["SIGNING_KEY_IDS"];

        const result = await lambdaHandlerConstructor(dependencies, request);

        expect(result.statusCode).toBe(500);
        expect(JSON.parse(result.body).error).toEqual("server_error");
        expect(JSON.parse(result.body).error_description).toEqual(
          "Server Error",
        );
      });
    });
  });

  describe("Request Service", () => {
    describe("Given the Request Service returns a log due to Invalid grant_type in request body", () => {
      it("Returns a 400 Bad Request response", async () => {
        dependencies.getRequestService = () =>
          new MockRequestServiceInvalidGrantTypeLogResponse();

        const result = await lambdaHandlerConstructor(dependencies, request);

        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body).error).toEqual("invalid_grant");
        expect(JSON.parse(result.body).error_description).toEqual(
          "Invalid grant type or grant type not specified",
        );
      });
    });

    describe("Given the Request Service returns a log due to invalid Authorization header ", () => {
      it("Returns a 400 Bad Request response", async () => {
        dependencies.getRequestService = () =>
          new MockRequestServiceInvalidAuthorizationHeaderLogResponse();

        const result = await lambdaHandlerConstructor(dependencies, request);

        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body).error).toEqual(
          "invalid_authorization_header",
        );
        expect(JSON.parse(result.body).error_description).toEqual(
          "Invalid authorization header",
        );
      });
    });
  });

  describe("SSM Service", () => {
    describe("Given there is an error retrieving client credentials from SSM", () => {
      it("Returns a 500 Server Error response", async () => {
        dependencies.getSsmService = () => new MockFailingSsmService();

        const result = await lambdaHandlerConstructor(dependencies, request);

        expect(JSON.parse(result.body).error).toEqual("server_error");
        expect(JSON.parse(result.body).error_description).toEqual(
          "Server Error",
        );
      });
    });
  });

  describe("Client Credentials Service", () => {
    describe("Get client credentials by ID", () => {
      describe("Given credentials are not found", () => {
        it("Returns 400 Bad Request response", async () => {
          dependencies.getClientCredentialsService = () =>
            new MockFailingClientCredentialsServiceGetClientCredentialsById();

          const result = await lambdaHandlerConstructor(dependencies, request);

          expect(result.statusCode).toBe(400);
          expect(JSON.parse(result.body).error).toEqual("invalid_client");
          expect(JSON.parse(result.body).error_description).toEqual(
            "Supplied client credentials not recognised",
          );
        });
      });
    });

    describe("Credential validation", () => {
      describe("Given credentials are not valid", () => {
        it("Returns 400 Bad request response", async () => {
          dependencies.getClientCredentialsService = () =>
            new MockFailingClientCredentialsServiceValidation();

          const result = await lambdaHandlerConstructor(dependencies, request);

          expect(result.statusCode).toBe(400);
          expect(JSON.parse(result.body).error).toEqual("invalid_client");
          expect(JSON.parse(result.body).error_description).toEqual(
            "Supplied client credentials not recognised",
          );
        });
      });
    });
  });

  describe("Token Service", () => {
    describe("Given minting a new token fails", () => {
      it("Returns 500 Server Error response", async () => {
        dependencies.getTokenService = () => new MockFailingTokenService();

        const result = await lambdaHandlerConstructor(dependencies, request);

        expect(result.statusCode).toBe(500);
        expect(JSON.parse(result.body).error).toEqual("server_error");
        expect(JSON.parse(result.body).error_description).toEqual(
          "Server Error",
        );
      });
    });
  });

  describe("Issue access token", () => {
    describe("Given the request is valid", () => {
      it("Returns with 200 response with an access token in the response body", async () => {
        const result = await lambdaHandlerConstructor(dependencies, request);

        expect(result.statusCode);
        expect(result.body).toEqual(
          JSON.stringify({
            access_token: "mockToken",
            token_type: "Bearer",
            expires_in: 3600,
          }),
        );
      });
    });
  });
});

class MockRequestServiceValueResponse implements IProcessRequest {
  processRequest = (): LogOrValue<IDecodedAuthorizationHeader> => {
    return value({
      clientId: "mockClientId",
      clientSecret: "mockClientSecret",
    });
  };
}

class MockRequestServiceInvalidGrantTypeLogResponse implements IProcessRequest {
  processRequest = (): LogOrValue<IDecodedAuthorizationHeader> => {
    return log("Invalid grant_type");
  };
}

class MockRequestServiceInvalidAuthorizationHeaderLogResponse
  implements IProcessRequest
{
  processRequest = (): LogOrValue<IDecodedAuthorizationHeader> => {
    return log("mockInvalidAuthorizationHeaderLog");
  };
}

class MockPassingSsmService implements IGetClientCredentials {
  getClientCredentials = async (
    clientCredentials: IClientCredentials[] = [
      {
        client_id: "mockClientId",
        issuer: "mockIssuer",
        salt: "mockSalt",
        hashed_client_secret: "mockHashedClientSecret",
      },
    ],
  ): Promise<LogOrValue<IClientCredentials[]>> => {
    return Promise.resolve(value(clientCredentials));
  };
}

class MockFailingSsmService implements IGetClientCredentials {
  getClientCredentials = async (): Promise<
    LogOrValue<IClientCredentials[]>
  > => {
    return log("Mock Failing SSM log");
  };
}

class MockPassingClientCredentialsService implements IClientCredentialsService {
  validate() {
    return true;
  }
  getClientCredentialsById() {
    return {
      client_id: "mockClientId",
      issuer: "mockIssuer",
      salt: "mockSalt",
      hashed_client_secret: "mockHashedClientSecret",
    };
  }
}

class MockFailingClientCredentialsServiceGetClientCredentialsById
  implements IClientCredentialsService
{
  getClientCredentialsById() {
    return null;
  }
  validate() {
    return false;
  }
}

class MockFailingClientCredentialsServiceValidation
  implements IClientCredentialsService
{
  getClientCredentialsById() {
    return {
      client_id: "mockClientId",
      issuer: "mockIssuer",
      salt: "mockSalt",
      hashed_client_secret: "mockHashedClientSecret",
    };
  }
  validate() {
    return false;
  }
}

class MockPassingTokenService implements IMintToken {
  async mintToken(): Promise<string> {
    return "mockToken";
  }
}

class MockFailingTokenService implements IMintToken {
  async mintToken(): Promise<string> {
    throw new Error("Failed to sign Jwt");
  }
}

//eslint-disable-next-line
function buildRequest(overrides?: any): APIGatewayProxyEvent {
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

const env = {
  SIGNING_KEY_IDS: "mockSigningKeyId",
};
