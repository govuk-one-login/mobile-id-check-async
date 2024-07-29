import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { IDecodedClientCredentials } from "../../types/clientCredentials";
import {
  ClientCredentialsService,
  IClientCredentials,
} from "./clientCredentialsService";
import { mockClient } from "aws-sdk-client-mock";

describe("Client Credentials Service", () => {
  let clientCredentialsService: ClientCredentialsService;
  let mockTokenSuppliedClientCredentials: IDecodedClientCredentials;
  let mockStoredClientCredentialsArray: IClientCredentials[];
  let mockStoredClientCredentials: IClientCredentials;

  beforeEach(() => {
    clientCredentialsService = new ClientCredentialsService();
    mockTokenSuppliedClientCredentials = {
      clientId: "mockClientId",
      clientSecret: "mockClientSecret",
    };
    mockStoredClientCredentialsArray = [
      {
        client_id: "mockClientId",
        issuer: "mockIssuer",
        salt: "0vjPs=djeEHP",
        hashed_client_secret:
          "964adf477e02f0fd3fac7fdd08655d1e70ba142f02c946e21e1e194f49a05379", // mockClientSecret hashing with above salt
        redirect_uri: "https://mockRedirectUri.com",
      },
      {
        client_id: "mockAnotherClientId",
        issuer: "mockIssuer",
        salt: "0vjPs=djeEHP",
        hashed_client_secret:
          "964adf477e02f0fd3fac7fdd08655d1e70ba142f02c946e21e1e194f49a05379", // mockClientSecret hashing with above salt
        redirect_uri: "https://mockRedirectUri.com",
      },
    ];
    mockStoredClientCredentials = {
      client_id: "mockClientId",
      issuer: "mockIssuer",
      salt: "0vjPs=djeEHP",
      hashed_client_secret:
        "964adf477e02f0fd3fac7fdd08655d1e70ba142f02c946e21e1e194f49a05379", // mockClientSecret hashing with above salt
      redirect_uri: "https://mockRedirectUri.com",
    };
  });

  describe("Get client credentials", () => {
    describe("Given there is an error calling SSM", () => {
      it("Returns error result", async () => {
        const ssmMock = mockClient(SSMClient);
        ssmMock.on(GetParameterCommand).rejects("SSM Error");

        const result =
          await clientCredentialsService.getAllRegisteredClientCredentials();

        expect(result.isError).toBe(true);
        expect(result.value).toEqual("Client Credentials not found");
      });
    });

    describe("Given the request to SSM is successful", () => {
      describe.each([
        {
          clientCredentials: undefined,
          scenario: "is undefined",
          expectedErrorMessage: "Client Credentials is null or undefined",
        },
        {
          clientCredentials: "{}}",
          scenario: "is invalid JSON",
          expectedErrorMessage: "Client Credentials is not valid JSON",
        },
        {
          clientCredentials: JSON.stringify({}),
          scenario: "is not an array",
          expectedErrorMessage: "Parsed Client Credentials array is malformed",
        },
        {
          clientCredentials: JSON.stringify([]),
          scenario: "is an empty array",
          expectedErrorMessage: "Parsed Client Credentials array is malformed",
        },
        {
          clientCredentials: JSON.stringify([{ client_id: "123" }]),
          scenario: "contains an object with incorrect keys",
          expectedErrorMessage: "Parsed Client Credentials array is malformed",
        },
        {
          clientCredentials: JSON.stringify([
            {
              client_id: [],
              issuer: "mockIssuer",
              salt: "mockSalt",
              hashed_client_secret: "mockHashedClientSecret",
            },
          ]),
          scenario:
            'contains an object where not all key types are in a "string" format',
          expectedErrorMessage: "Parsed Client Credentials array is malformed",
        },
        {
          clientCredentials: JSON.stringify([
            {
              client_id: "mockClientId",
              issuer: "mockIssuer",
              salt: "mockSalt",
              hashed_client_secret: "mockHashedClientSecret",
            },
            {
              client_id: [],
              issuer: "mockIssuer",
              salt: "mockSalt",
              hashed_client_secret: "mockHashedClientSecret",
            },
          ]),
          scenario:
            "contains multiple objects with where at least one key is incorrect",
          expectedErrorMessage: "Parsed Client Credentials array is malformed",
        },
      ])(
        "Given the Client Credential array $scenario",
        ({ clientCredentials, expectedErrorMessage }) => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SSMClient);
            ssmMock
              .on(GetParameterCommand)
              .resolves({ Parameter: { Value: clientCredentials } });

            const result =
              await clientCredentialsService.getAllRegisteredClientCredentials();

            expect(result.isError).toBe(true);
            expect(result.value).toEqual(expectedErrorMessage);
          });
        },
      );

      describe("Given the Credential object is valid", () => {
        it("Returns success result with Credential object", async () => {
          const ssmMock = mockClient(SSMClient);
          ssmMock.on(GetParameterCommand).resolves({
            Parameter: {
              Value: JSON.stringify([
                {
                  client_id: "mockClientId",
                  issuer: "mockIssuer",
                  salt: "mockSalt",
                  hashed_client_secret: "mockHashedClientSecret",
                },
              ]),
            },
          });

          const result =
            await clientCredentialsService.getAllRegisteredClientCredentials();

          expect(result.isError).toBe(false);
          expect(result.value).toStrictEqual([
            {
              client_id: "mockClientId",
              issuer: "mockIssuer",
              salt: "mockSalt",
              hashed_client_secret: "mockHashedClientSecret",
            },
          ]);
        });

        it("Utilizes cache for subsequent requests", async () => {
          const ssmMock = mockClient(SSMClient);
          ssmMock.on(GetParameterCommand).resolves({
            Parameter: {
              Value: JSON.stringify([
                {
                  client_id: "mockClientId",
                  issuer: "mockIssuer",
                  salt: "mockSalt",
                  hashed_client_secret: "mockHashedClientSecret",
                },
              ]),
            },
          });

          clientCredentialsService.resetCache();

          // First call should populate the cache
          await clientCredentialsService.getAllRegisteredClientCredentials();
          // Second call should use cache
          await clientCredentialsService.getAllRegisteredClientCredentials();

          // Expect SSM to have been called only once, since the second call uses cache
          expect(ssmMock.calls()).toHaveLength(1);
        });

        it("Refreshes cache after TTL expires", async () => {
          const ssmMock = mockClient(SSMClient);

          jest.useFakeTimers();

          ssmMock.on(GetParameterCommand).resolves({
            Parameter: {
              Value: JSON.stringify([
                {
                  client_id: "mockClientId",
                  issuer: "mockIssuer",
                  salt: "mockSalt",
                  hashed_client_secret: "mockHashedClientSecret",
                },
              ]),
            },
          });

          clientCredentialsService.resetCache();
          await clientCredentialsService.getAllRegisteredClientCredentials();
          // Simulate time passing to exceed cache TTL
          jest.advanceTimersByTime(clientCredentialsService.cacheTTL + 1);
          // This call should refresh cache
          await clientCredentialsService.getAllRegisteredClientCredentials();

          // Expect SSM to have been called twice: once to populate, once to refresh after TTL
          expect(ssmMock.calls()).toHaveLength(2);
          jest.useRealTimers();
        });
      });
    });
  });

  describe("Validate token request credentials", () => {
    describe("Given the supplied hashed client secret does not match the stored hashed client secret", () => {
      it("Returns false", async () => {
        mockTokenSuppliedClientCredentials = {
          clientId: "mockClientId",
          clientSecret: "mockInvalidClientSecret",
        };

        const result = clientCredentialsService.validateAsyncTokenRequest(
          mockStoredClientCredentials,
          mockTokenSuppliedClientCredentials,
        );

        expect(result.isError).toBe(true);
        expect(result.value).toBe(
          "Client secret not valid for the supplied clientId",
        );
      });
    });

    describe("redirect_uri validation", () => {
      describe("Given redirect_uri is not present", () => {
        it("Returns a log", () => {
          mockStoredClientCredentials.redirect_uri = "";

          const result = clientCredentialsService.validateAsyncTokenRequest(
            mockStoredClientCredentials,
            mockTokenSuppliedClientCredentials,
          );

          expect(result.isError).toBe(true);
          expect(result.value).toBe("Missing redirect_uri");
        });
      });

      describe("Given redirect_uri is not a valid URL", () => {
        it("Returns a log", () => {
          mockStoredClientCredentials.redirect_uri = "mockInvalidURL";

          const result = clientCredentialsService.validateAsyncTokenRequest(
            mockStoredClientCredentials,
            mockTokenSuppliedClientCredentials,
          );

          expect(result.isError).toBe(true);
          expect(result.value).toBe("Invalid redirect_uri");
        });
      });
    });

    describe("Given the supplied credentials match the stored credentials", () => {
      it("Returns true", async () => {
        mockTokenSuppliedClientCredentials = {
          clientId: "mockAnotherClientId",
          clientSecret: "mockClientSecret",
        };

        const result = clientCredentialsService.validateAsyncTokenRequest(
          mockStoredClientCredentials,
          mockTokenSuppliedClientCredentials,
        );

        expect(result.isError).toBe(false);
        expect(result.value).toBe(null);
      });
    });
  });

  describe("Validate credential request credentials", () => {
    describe("redirect_uri validation", () => {
      describe("Given stored redirect_uri is not present", () => {
        it("Returns an error result", () => {
          mockStoredClientCredentials.redirect_uri = "";

          const result =
            clientCredentialsService.validateAsyncCredentialRequest({
              aud: "mockIssuer",
              issuer: "mockIssuer",
              registeredClientCredentials: mockStoredClientCredentials,
            });

          expect(result.isError).toBe(true);
          expect(result.value).toBe("Missing redirect_uri");
        });
      });

      describe("Given stored redirect_uri is not a valid URL", () => {
        it("Returns an error result", () => {
          mockStoredClientCredentials.redirect_uri = "mockInvalidURL";

          const result =
            clientCredentialsService.validateAsyncCredentialRequest({
              aud: "mockIssuer",
              issuer: "mockIssuer",
              registeredClientCredentials: mockStoredClientCredentials,
              redirectUri: "https://mockRedirectUri.com",
            });

          expect(result.isError).toBe(true);
          expect(result.value).toBe("Invalid redirect_uri");
        });
      });

      describe("Given supplied redirect_uri does not match stored redirect_uri", () => {
        it("Returns an error result", () => {
          const result =
            clientCredentialsService.validateAsyncCredentialRequest({
              aud: "mockIssuer",
              issuer: "mockIssuer",
              registeredClientCredentials: mockStoredClientCredentials,
              redirectUri: "https://mockInvalidRedirectUri.com",
            });

          expect(result.isError).toBe(true);
          expect(result.value).toBe("Unregistered redirect_uri");
        });
      });

      describe("Given redirect_uri is present and registered", () => {
        it("Returns a success result", () => {
          const result =
            clientCredentialsService.validateAsyncCredentialRequest({
              aud: "mockIssuer",
              issuer: "mockIssuer",
              registeredClientCredentials: mockStoredClientCredentials,
              redirectUri: "https://mockRedirectUri.com",
            });

          expect(result.isError).toBe(false);
          expect(result.value).toBe(null);
        });
      });
    });

    describe("aud validation", () => {
      describe("Given supplied aud claim does not match registered issuer", () => {
        it("Returns error result", () => {
          const result =
            clientCredentialsService.validateAsyncCredentialRequest({
              aud: "mockInvalidIssuer",
              issuer: "mockIssuer",
              registeredClientCredentials: mockStoredClientCredentials,
              redirectUri: "https://mockRedirectUri.com",
            });

          expect(result.isError).toBe(true);
          expect(result.value).toBe("Invalid aud claim");
        });
      });
    });
  });

  describe("Get client credentials by ID", () => {
    describe("Given the supplied credential clientId is not present in the stored credentials array", () => {
      it("Returns error result", async () => {
        mockTokenSuppliedClientCredentials = {
          clientId: "mockInvalidClientId",
          clientSecret: "mockClientSecret",
        };

        const result =
          clientCredentialsService.getRegisteredClientCredentialsById(
            mockStoredClientCredentialsArray,
            mockTokenSuppliedClientCredentials.clientId,
          );

        expect(result.isError).toBe(true);
        expect(result.value).toBe("ClientId not registered");
      });
    });

    describe("Given the supplied clientId is present in the stored credentials array", () => {
      it("Returns success result with client credentials", async () => {
        mockTokenSuppliedClientCredentials = {
          clientId: "mockClientId",
          clientSecret: "mockClientSecret",
        };
        const expectedClientCredentials = {
          client_id: "mockClientId",
          issuer: "mockIssuer",
          salt: "0vjPs=djeEHP",
          hashed_client_secret:
            "964adf477e02f0fd3fac7fdd08655d1e70ba142f02c946e21e1e194f49a05379", // mockClientSecret hashing with above salt
          redirect_uri: "https://mockRedirectUri.com",
        };

        const result =
          clientCredentialsService.getRegisteredClientCredentialsById(
            mockStoredClientCredentialsArray,
            mockTokenSuppliedClientCredentials.clientId,
          );
        expect(result.isError).toBe(false);
        expect(result.value).toEqual(expectedClientCredentials);
      });
    });
  });
});
