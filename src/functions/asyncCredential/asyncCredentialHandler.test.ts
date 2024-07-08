import { APIGatewayProxyResult } from "aws-lambda";
import { buildRequest } from "../testUtils/mockRequest";
import { LogOrValue, log, value } from "../types/logOrValue";
import {
  IVerifyTokenSignature,
  TokenService,
} from "./TokenService/tokenService.test";
import { Dependencies, lambdaHandler } from "./asyncCredentialHandler";
import {
  IClientCredentials,
  IClientCredentialsService,
} from "../services/clientCredentialsService/clientCredentialsService";
import { IDecodedClientCredentials } from "../types/clientCredentials";
import { IGetClientCredentials } from "../asyncToken/ssmService/ssmService";

const mockJwtNoExp =
  "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.0C_S0NEicI6k1yaTAV0l85Z0SlW3HI2YIqJb_unXZ1MttAvjR9wAOhsl_0X20i1NYN0ZhnaoHnGLpApUSz2kwQ";

const mockJwtIatInTheFuture =
  "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoiMjE0NTk2NDY5NSIsImlhdCI6IjIxNDU5NjQ2OTUifQ.VnfFwIElQqPwbayMqLz-YaUK-BOx9tEKJE4_N49xh65TQvtP-9EWaPgD0D0C_3hULWjtvt2gh46nTPi-m7-y4A";

const mockJwtExpInThePast =
  "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.LMHQh9wrANRpJYdQsP1oOVsrDEFTTJTYgpUVBy_w1Jd8GFRLwbenFEjFyXr2PZF-COP9xI87vpEOtrAri3ge8A";

const mockJwtNbfInFuture =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoiMTUxNjIzOTAyMiIsImV4cCI6IjIxNDU5NjQ2OTUiLCJuYmYiOiIyMTQ1OTY0Njk1In0.7-OeXAHrUdvRirCd_7H_yxFf8aGzkGIk944gqAbCBVM";

const mockJwtNoIss =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoiMTUxNjIzOTAyMiIsImV4cCI6IjIxNDU5NjQ2OTUiLCJuYmYiOiIxNTE2MjM5MDIyIn0.PO0IKWByJKerqZonGpagwKEaX-psQQPYZPPnXwI3JC4";

const mockJwtIssNotValid =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoiMTUxNjIzOTAyMiIsImV4cCI6IjIxNDU5NjQ2OTUiLCJuYmYiOiIxNTE2MjM5MDIyIiwiaXNzIjoibW9ja0ludmFsaWRJc3N1ZXIifQ.K9lS44Bm3iHfXxAL2q-SBK2q-HB2NQ-UQSlmoqaaBVw";

const mockJwtNoScope =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoiMTUxNjIzOTAyMiIsImV4cCI6IjIxNDU5NjQ2OTUiLCJuYmYiOiIxNTE2MjM5MDIyIiwiaXNzIjoibW9ja0lzc3VlciJ9._-4Sn9N5grVDSxI2vvoUH90-6bAh6nH53ELZ38b3Gwk";

const mockJwtScopeNotValid =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoiMTUxNjIzOTAyMiIsImV4cCI6IjIxNDU5NjQ2OTUiLCJuYmYiOiIxNTE2MjM5MDIyIiwiaXNzIjoibW9ja0lzc3VlciIsInNjb3BlIjoibW9ja0ludmFsaWRTY29wZSJ9.kO0R0-bN6uYkknOD9E0oqtpRlp0rHB-6njrHN3mKkX4";

const mockJwtNoClientId =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoiMTUxNjIzOTAyMiIsImV4cCI6IjIxNDU5NjQ2OTUiLCJuYmYiOiIxNTE2MjM5MDIyIiwiaXNzIjoibW9ja0lzc3VlciIsInNjb3BlIjoiZGNtYXcuc2Vzc2lvbi5hc3luY19jcmVhdGUifQ.xN-h1mVndN7kNRSrVM0WLcdKblniD3q70xnY-RYBIlc";

const mockJwtNoAud =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoiMTUxNjIzOTAyMiIsImV4cCI6IjIxNDU5NjQ2OTUiLCJuYmYiOiIxNTE2MjM5MDIyIiwiaXNzIjoibW9ja0lzc3VlciIsInNjb3BlIjoiZGNtYXcuc2Vzc2lvbi5hc3luY19jcmVhdGUiLCJjbGllbnRfaWQiOiJtb2NrQ2xpZW50SWQifQ.FzBrIcM0DDp1ecivQpCNF216l2ZFzU3fPAOgAegKylY";

const mockJwtInvalidAud =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoiMTUxNjIzOTAyMiIsImV4cCI6IjIxNDU5NjQ2OTUiLCJuYmYiOiIxNTE2MjM5MDIyIiwiaXNzIjoibW9ja0lzc3VlciIsInNjb3BlIjoiZGNtYXcuc2Vzc2lvbi5hc3luY19jcmVhdGUiLCJjbGllbnRfaWQiOiJtb2NrQ2xpZW50SWQiLCJhdWQiOiJpbnZhbGlkSXNzdWVyIn0.eaBbLzwDd69MaqozqXJnWqQI8JQK8rcughYlbS29qD0";

const mockValidJwt =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoiMTUxNjIzOTAyMiIsImV4cCI6IjIxNDU5NjQ2OTUiLCJuYmYiOiIxNTE2MjM5MDIyIiwiaXNzIjoibW9ja0lzc3VlciIsInNjb3BlIjoiZGNtYXcuc2Vzc2lvbi5hc3luY19jcmVhdGUiLCJjbGllbnRfaWQiOiJtb2NrQ2xpZW50SWQiLCJhdWQiOiJtb2NrSXNzdWVyIn0.Ik_kbkTVKzlXadti994bAtiHaFO1KsD4_yJGt4wpjr8";
const env = {
  SIGNING_KEY_ID: "mockKid",
  ISSUER: "mockIssuer",
};

describe("Async Credential", () => {
  let dependencies: Dependencies;

  beforeEach(() => {
    dependencies = {
      tokenService: () => new MockTokenSeviceValidSignature(),
      ssmService: () => new MockPassingSsmService(),
      clientCredentialsService: () => new MockPassingClientCredentialsService(),
      env,
    };
  });

  describe("Environment variable validation", () => {
    describe("Given SIGNING_KEY_ID is missing", () => {
      it("Returns a 500 Server Error response", async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        delete dependencies.env["SIGNING_KEY_ID"];
        const event = buildRequest();
        const result = await lambdaHandler(event, dependencies);

        expect(result.statusCode).toBe(500);
        expect(JSON.parse(result.body).error).toEqual("server_error");
        expect(JSON.parse(result.body).error_description).toEqual(
          "Server Error",
        );
      });
    });

    describe("Given ISSUER is missing", () => {
      it("Returns a 500 Server Error response", async () => {
        dependencies.env = JSON.parse(JSON.stringify(env));
        delete dependencies.env["ISSUER"];
        const event = buildRequest();
        const result = await lambdaHandler(event, dependencies);

        expect(result.statusCode).toBe(500);
        expect(JSON.parse(result.body).error).toEqual("server_error");
        expect(JSON.parse(result.body).error_description).toEqual(
          "Server Error",
        );
      });
    });
  });

  describe("Access token validation", () => {
    describe("Given access token payload is missing", () => {
      it("Returns 401 Unauthorized", async () => {
        const event = buildRequest();

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );
        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 401,
          body: "Unauthorized",
        });
      });
    });

    describe("Given access token does not start with Bearer", () => {
      it("Returns 401 Unauthorized", async () => {
        const event = buildRequest({
          headers: { Authorization: "noBearerString mockToken" },
        });

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );
        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 401,
          body: "Unauthorized",
        });
      });
    });

    describe("Given Bearer token is not in expected format - contains spaces", () => {
      it("Returns 401 Unauthorized", async () => {
        const event = buildRequest({
          headers: { Authorization: "Bearer mock token" },
        });

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );
        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 401,
          body: "Unauthorized",
        });
      });
    });

    describe("Given Bearer token is not in expected format - missing token", () => {
      it("Returns 401 Unauthorized", async () => {
        const event = buildRequest({
          headers: { Authorization: "Bearer " },
        });

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );
        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 401,
          body: "Unauthorized",
        });
      });
    });
  });

  describe("JWT payload validation", () => {
    describe("exp claim validation", () => {
      describe("Given expiry date is missing", () => {
        it("Returns a log", async () => {
          const event = buildRequest({
            headers: { Authorization: `Bearer ${mockJwtNoExp}` },
          });

          dependencies.tokenService = () => new MockTokenSeviceValidSignature();

          const result: APIGatewayProxyResult = await lambdaHandler(
            event,
            dependencies,
          );

          expect(result).toStrictEqual({
            headers: { "Content-Type": "application/json" },
            statusCode: 400,
            body: JSON.stringify({
              error: "bad_request",
              error_description: "Missing exp claim",
            }),
          });
        });
      });

      describe("Given expiry date is in the past", () => {
        it("Returns a log", async () => {
          const event = buildRequest({
            headers: { Authorization: `Bearer ${mockJwtExpInThePast}` },
          });

          dependencies.tokenService = () => new MockTokenSeviceValidSignature();

          const result: APIGatewayProxyResult = await lambdaHandler(
            event,
            dependencies,
          );

          expect(result).toStrictEqual({
            headers: { "Content-Type": "application/json" },
            statusCode: 400,
            body: JSON.stringify({
              error: "bad_request",
              error_description: "exp claim is in the past",
            }),
          });
        });
      });
    });

    describe("iat claim validation", () => {
      // iat does not need to be present
      describe("Given issued at (iat) is in the future", () => {
        it("Returns a log", async () => {
          const event = buildRequest({
            headers: { Authorization: `Bearer ${mockJwtIatInTheFuture}` },
          });

          dependencies.tokenService = () => new MockTokenSeviceValidSignature();

          const result: APIGatewayProxyResult = await lambdaHandler(
            event,
            dependencies,
          );

          expect(result).toStrictEqual({
            headers: { "Content-Type": "application/json" },
            statusCode: 400,
            body: JSON.stringify({
              error: "bad_request",
              error_description: "iat claim is in the future",
            }),
          });
        });
      });
    });

    describe("nbf claim validation", () => {
      // nbf does not need to be present
      describe("Given not before (nbf) is in the future", () => {
        it("Returns a log", async () => {
          const event = buildRequest({
            headers: { Authorization: `Bearer ${mockJwtNbfInFuture}` },
          });

          dependencies.tokenService = () => new MockTokenSeviceValidSignature();

          const result: APIGatewayProxyResult = await lambdaHandler(
            event,
            dependencies,
          );

          expect(result).toStrictEqual({
            headers: { "Content-Type": "application/json" },
            statusCode: 400,
            body: JSON.stringify({
              error: "bad_request",
              error_description: "nbf claim is in the future",
            }),
          });
        });
      });
    });

    describe("iss claim validation", () => {
      describe("Given issuer (iss) is missing", () => {
        it("Returns a log", async () => {
          const event = buildRequest({
            headers: { Authorization: `Bearer ${mockJwtNoIss}` },
          });

          dependencies.tokenService = () => new MockTokenSeviceValidSignature();

          const result: APIGatewayProxyResult = await lambdaHandler(
            event,
            dependencies,
          );

          expect(result).toStrictEqual({
            headers: { "Content-Type": "application/json" },
            statusCode: 400,
            body: JSON.stringify({
              error: "bad_request",
              error_description: "Missing iss claim",
            }),
          });
        });
      });

      describe("Given issuer (iss) is invalid", () => {
        it("Returns a log", async () => {
          const event = buildRequest({
            headers: { Authorization: `Bearer ${mockJwtIssNotValid}` },
          });

          dependencies.tokenService = () => new MockTokenSeviceValidSignature();

          const result: APIGatewayProxyResult = await lambdaHandler(
            event,
            dependencies,
          );

          expect(result).toStrictEqual({
            headers: { "Content-Type": "application/json" },
            statusCode: 400,
            body: JSON.stringify({
              error: "bad_request",
              error_description: "iss claim does not match registered issuer",
            }),
          });
        });
      });
    });

    describe("scope claim validation", () => {
      describe("Given scope is missing", () => {
        it("Returns a log", async () => {
          const event = buildRequest({
            headers: { Authorization: `Bearer ${mockJwtNoScope}` },
          });

          dependencies.tokenService = () => new MockTokenSeviceValidSignature();

          const result: APIGatewayProxyResult = await lambdaHandler(
            event,
            dependencies,
          );

          expect(result).toStrictEqual({
            headers: { "Content-Type": "application/json" },
            statusCode: 400,
            body: JSON.stringify({
              error: "bad_request",
              error_description: "Missing scope claim",
            }),
          });
        });
      });

      describe("Given scope is invalid", () => {
        it("Returns a log", async () => {
          const event = buildRequest({
            headers: { Authorization: `Bearer ${mockJwtScopeNotValid}` },
          });

          dependencies.tokenService = () => new MockTokenSeviceValidSignature();

          const result: APIGatewayProxyResult = await lambdaHandler(
            event,
            dependencies,
          );

          expect(result).toStrictEqual({
            headers: { "Content-Type": "application/json" },
            statusCode: 401,
            body: "Unauthorized",
          });
        });
      });
    });

    describe("client_id claim validation", () => {
      describe("Given client_id is missing", () => {
        it("Returns a log", async () => {
          const event = buildRequest({
            headers: { Authorization: `Bearer ${mockJwtNoClientId}` },
          });

          dependencies.tokenService = () => new MockTokenSeviceValidSignature();

          const result: APIGatewayProxyResult = await lambdaHandler(
            event,
            dependencies,
          );

          expect(result).toStrictEqual({
            headers: { "Content-Type": "application/json" },
            statusCode: 401,
            body: "Unauthorized",
          });
        });
      });
    });

    describe("aud claim validation", () => {
      describe("Given aud (audience) is missing", () => {
        it("Returns a log", async () => {
          const event = buildRequest({
            headers: { Authorization: `Bearer ${mockJwtNoAud}` },
          });

          dependencies.tokenService = () => new MockTokenSeviceValidSignature();

          const result: APIGatewayProxyResult = await lambdaHandler(
            event,
            dependencies,
          );

          expect(result).toStrictEqual({
            headers: { "Content-Type": "application/json" },
            statusCode: 401,
            body: "Unauthorized",
          });
        });
      });
    });
  });

  describe("JWT signature verification", () => {
    describe("Given that the JWT signature verification fails", () => {
      it("Returns 401 Unauthorized", async () => {
        dependencies.tokenService = () => new MockTokenSeviceInvalidSignature();

        const event = buildRequest({
          headers: { Authorization: `Bearer ${mockValidJwt}` },
        });

        const result: APIGatewayProxyResult = await lambdaHandler(
          event,
          dependencies,
        );

        expect(result).toStrictEqual({
          headers: { "Content-Type": "application/json" },
          statusCode: 401,
          body: "Unauthorized",
        });
      });
    });
  });

  describe("SSM Service", () => {
    describe("Given there is an error retrieving client credentials from SSM", () => {
      it("Returns a 500 Server Error response", async () => {
        dependencies.ssmService = () => new MockFailingSsmService();

        const event = buildRequest({
          headers: { Authorization: `Bearer ${mockValidJwt}` },
        });

        const result = await lambdaHandler(event, dependencies);

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
          const event = buildRequest({
            headers: { Authorization: `Bearer ${mockValidJwt}` },
          });
          dependencies.clientCredentialsService = () =>
            new MockFailingClientCredentialsServiceGetClientCredentialsById();

          const result = await lambdaHandler(event, dependencies);

          expect(result.statusCode).toBe(400);
          expect(JSON.parse(result.body).error).toEqual("invalid_client");
          expect(JSON.parse(result.body).error_description).toEqual(
            "Supplied client not recognised",
          );
        });
      });
    });
  });

  describe("JWT Payload validation - using Client Credentials", () => {
    describe("aud claim does not match registered issue for given client", () => {
      it("Returns a 400 Bad request response", async () => {
        const event = buildRequest({
          headers: { Authorization: `Bearer ${mockJwtInvalidAud}` },
        });
        dependencies.clientCredentialsService = () =>
          new MockPassingClientCredentialsService();

        const result = await lambdaHandler(event, dependencies);

        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body).error).toEqual("invalid_client");
        expect(JSON.parse(result.body).error_description).toEqual(
          "Invalid aud claim",
        );
      });
    });
  });
});

class MockTokenSeviceInvalidSignature implements IVerifyTokenSignature {
  verifyTokenSignature(): Promise<LogOrValue<null>> {
    return Promise.resolve(log(""));
  }
}

class MockTokenSeviceValidSignature implements IVerifyTokenSignature {
  verifyTokenSignature(): Promise<LogOrValue<null>> {
    return Promise.resolve(value(null));
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

class MockPassingClientCredentialsService implements IClientCredentialsService {
  validate(
    _storedCredentials: IClientCredentials,
    _suppliedCredentials: IDecodedClientCredentials,
  ) {
    return true;
  }
  getClientCredentialsById(
    _storedCredentialsArray: IClientCredentials[],
    _suppliedClientId: string,
  ) {
    return {
      client_id: "mockClientId",
      issuer: "mockIssuer",
      salt: "mockSalt",
      hashed_client_secret: "mockHashedClientSecret",
    };
  }
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
