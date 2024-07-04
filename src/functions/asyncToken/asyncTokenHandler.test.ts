import { APIGatewayProxyEvent } from "aws-lambda";
import { LogOrValue, log, value } from "../types/logOrValue";
import {
  IAsyncTokenRequestDependencies,
  lambdaHandlerConstructor,
} from "./asyncTokenHandler";
import {
  IClientCredentials,
  IClientCredentialsService,
} from "../services/clientCredentialsService/clientCredentialsService";
import { IProcessRequest } from "./requestService/requestService";
import { IGetClientCredentials } from "./ssmService/ssmService";
import { IJwtPayload, IMintToken } from "./tokenService/tokenService";
import { buildRequest } from "../testUtils/mockRequest";
import { IDecodedClientCredentials } from "../types/clientCredentials";

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
    describe("Given SIGNING_KEY_ID is missing", () => {
      it("Returns a 500 Server Error response", async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        delete dependencies.env["SIGNING_KEY_ID"];

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
  processRequest = (
    request: APIGatewayProxyEvent,
  ): LogOrValue<IDecodedClientCredentials> => {
    return value({
      clientId: "mockClientId",
      clientSecret: "mockClientSecret",
    });
  };
}

class MockRequestServiceInvalidGrantTypeLogResponse implements IProcessRequest {
  processRequest = (
    request: APIGatewayProxyEvent,
  ): LogOrValue<IDecodedClientCredentials> => {
    return log("Invalid grant_type");
  };
}

class MockRequestServiceInvalidAuthorizationHeaderLogResponse
  implements IProcessRequest
{
  processRequest = (
    request: APIGatewayProxyEvent,
  ): LogOrValue<IDecodedClientCredentials> => {
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
  validate(
    storedCredentials: IClientCredentials,
    suppliedCredentials: IDecodedClientCredentials,
  ) {
    return true;
  }
  getClientCredentialsById(
    storedCredentialsArray: IClientCredentials[],
    suppliedClientId: string,
  ) {
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
  getClientCredentialsById(
    storedCredentialsArray: IClientCredentials[],
    suppliedClientId: string,
  ) {
    return null;
  }
  validate(
    storedCredentials: IClientCredentials,
    suppliedCredentials: IDecodedClientCredentials,
  ) {
    return false;
  }
}

class MockFailingClientCredentialsServiceValidation
  implements IClientCredentialsService
{
  getClientCredentialsById(
    storedCredentialsArray: IClientCredentials[],
    suppliedClientId: string,
  ) {
    return {
      client_id: "mockClientId",
      issuer: "mockIssuer",
      salt: "mockSalt",
      hashed_client_secret: "mockHashedClientSecret",
    };
  }
  validate(
    storedCredentials: IClientCredentials,
    suppliedCredentials: IDecodedClientCredentials,
  ) {
    return false;
  }
}

class MockPassingTokenService implements IMintToken {
  async mintToken(jwtPayload: IJwtPayload): Promise<string> {
    return "mockToken";
  }
}

class MockFailingTokenService implements IMintToken {
  async mintToken(jwtPayload: IJwtPayload): Promise<string> {
    throw new Error("Failed to sign Jwt");
  }
}

const env = {
  SIGNING_KEY_ID: "mockSigningKeyId",
};
