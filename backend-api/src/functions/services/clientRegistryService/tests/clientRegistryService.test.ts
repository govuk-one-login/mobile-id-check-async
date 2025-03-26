import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { mockClient } from "aws-sdk-client-mock";
import { ClientRegistryService } from "../clientRegistryService";
import { ErrorCategory } from "../../../utils/result";

describe("Client Credentials Service", () => {
  let clientCredentialsService: ClientRegistryService;

  beforeEach(() => {
    clientCredentialsService = new ClientRegistryService("mockParameterName");
    clientCredentialsService.resetCache();
  });

  describe("Get issuer from client secrets", () => {
    describe("Given there is an unexpected error retrieving the client registry", () => {
      it("Returns error result", async () => {
        const ssmMock = mockClient(SecretsManagerClient);
        ssmMock.on(GetSecretValueCommand).rejects("SSM Error");

        const result =
          await clientCredentialsService.getRegisteredIssuerUsingClientSecrets({
            clientId: "mockAnotherClientId",
            clientSecret: "mockClientSecret",
          });

        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Error retrieving client secrets",
          errorCategory: ErrorCategory.SERVER_ERROR,
        });
      });
    });

    describe("Given the client registry is successfully retrieved", () => {
      describe("Schema validation", () => {
        describe("Given no client registry was found", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({});

            const result =
              await clientCredentialsService.getRegisteredIssuerUsingClientSecrets(
                {
                  clientId: "mockAnotherClientId",
                  clientSecret: "mockClientSecret",
                },
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry not found",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });

        describe("Given client registry is not a valid JSON", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: "{{{",
            });

            const result =
              await clientCredentialsService.getRegisteredIssuerUsingClientSecrets(
                {
                  clientId: "mockAnotherClientId",
                  clientSecret: "mockClientSecret",
                },
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry is not a valid JSON",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });

        describe("Given client registry is not an array", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: "{}",
            });

            const result =
              await clientCredentialsService.getRegisteredIssuerUsingClientSecrets(
                {
                  clientId: "mockAnotherClientId",
                  clientSecret: "mockClientSecret",
                },
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry is not an array",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });
        describe("Given client registry is empty", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: "[]",
            });

            const result =
              await clientCredentialsService.getRegisteredIssuerUsingClientSecrets(
                {
                  clientId: "mockAnotherClientId",
                  clientSecret: "mockClientSecret",
                },
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry is empty",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });
        describe("Given the clientId is missing", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  issuer: "mockIssuer",
                  salt: "0vjPs=djeEHP",
                  hashed_client_secret:
                    "964adf477e02f0fd3fac7fdd08655d1e70ba142f02c946e21e1e194f49a05379", // mockClientSecret hashing with above salt
                  redirect_uri: "https://mockRedirectUri.com",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getRegisteredIssuerUsingClientSecrets(
                {
                  clientId: "mockAnotherClientId",
                  clientSecret: "mockClientSecret",
                },
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry failed schema validation",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });

        describe("Given the clientId is not a string", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: 1,
                  issuer: "mockIssuer",
                  salt: "0vjPs=djeEHP",
                  hashed_client_secret:
                    "964adf477e02f0fd3fac7fdd08655d1e70ba142f02c946e21e1e194f49a05379", // mockClientSecret hashing with above salt
                  redirect_uri: "https://mockRedirectUri.com",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getRegisteredIssuerUsingClientSecrets(
                {
                  clientId: "mockAnotherClientId",
                  clientSecret: "mockClientSecret",
                },
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry failed schema validation",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });

        describe("Given the salt is missing", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "clientId",
                  issuer: "mockIssuer",
                  hashed_client_secret:
                    "964adf477e02f0fd3fac7fdd08655d1e70ba142f02c946e21e1e194f49a05379", // mockClientSecret hashing with above salt
                  redirect_uri: "https://mockRedirectUri.com",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getRegisteredIssuerUsingClientSecrets(
                {
                  clientId: "mockAnotherClientId",
                  clientSecret: "mockClientSecret",
                },
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry failed schema validation",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });
        describe("Given the salt is not a string", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "clientId",
                  salt: 1,
                  issuer: "mockIssuer",
                  hashed_client_secret:
                    "964adf477e02f0fd3fac7fdd08655d1e70ba142f02c946e21e1e194f49a05379", // mockClientSecret hashing with above salt
                  redirect_uri: "https://mockRedirectUri.com",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getRegisteredIssuerUsingClientSecrets(
                {
                  clientId: "mockAnotherClientId",
                  clientSecret: "mockClientSecret",
                },
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry failed schema validation",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });

        describe("Given the issuer is missing", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "clientId",
                  salt: "salt",
                  hashed_client_secret:
                    "964adf477e02f0fd3fac7fdd08655d1e70ba142f02c946e21e1e194f49a05379", // mockClientSecret hashing with above salt
                  redirect_uri: "https://mockRedirectUri.com",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getRegisteredIssuerUsingClientSecrets(
                {
                  clientId: "mockAnotherClientId",
                  clientSecret: "mockClientSecret",
                },
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry failed schema validation",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });

        describe("Given the issuer is not a string", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "clientId",
                  salt: "salt",
                  issuer: 1,
                  hashed_client_secret:
                    "964adf477e02f0fd3fac7fdd08655d1e70ba142f02c946e21e1e194f49a05379", // mockClientSecret hashing with above salt
                  redirect_uri: "https://mockRedirectUri.com",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getRegisteredIssuerUsingClientSecrets(
                {
                  clientId: "mockAnotherClientId",
                  clientSecret: "mockClientSecret",
                },
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry failed schema validation",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });

        describe("Given the hashed client secret is missing", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "clientId",
                  salt: "salt",
                  issuer: "issuer",
                  redirect_uri: "https://mockRedirectUri.com",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getRegisteredIssuerUsingClientSecrets(
                {
                  clientId: "mockAnotherClientId",
                  clientSecret: "mockClientSecret",
                },
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry failed schema validation",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });

        describe("Given the hashed client secret is not a string", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "clientId",
                  salt: "salt",
                  issuer: "issuer",
                  hashed_client_secret: 1,
                  redirect_uri: "https://mockRedirectUri.com",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getRegisteredIssuerUsingClientSecrets(
                {
                  clientId: "mockAnotherClientId",
                  clientSecret: "mockClientSecret",
                },
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry failed schema validation",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });

        describe("Given the redirect_uri is missing", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "clientId",
                  salt: "salt",
                  issuer: "issuer",
                  hashed_client_secret: "hashedSecret",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getRegisteredIssuerUsingClientSecrets(
                {
                  clientId: "mockAnotherClientId",
                  clientSecret: "mockClientSecret",
                },
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry failed schema validation",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });

        describe("Given the redirect_uri is not a URL", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "clientId",
                  salt: "salt",
                  issuer: "issuer",
                  hashed_client_secret: "hashedSecret",
                  redirect_uri: "invalidUrl",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getRegisteredIssuerUsingClientSecrets(
                {
                  clientId: "mockAnotherClientId",
                  clientSecret: "mockClientSecret",
                },
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry failed schema validation",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });

        describe("Given more than one registered client fails validation", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "clientId",
                  salt: "salt",
                  issuer: "issuer",
                  hashed_client_secret: "hashedSecret",
                },
                {
                  client_id: "clientId",
                  salt: "salt",
                  issuer: "issuer",
                  hashed_client_secret: "hashedSecret",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getRegisteredIssuerUsingClientSecrets(
                {
                  clientId: "mockAnotherClientId",
                  clientSecret: "mockClientSecret",
                },
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry failed schema validation",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });

        describe("Given only one registered client fails validation", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "clientId",
                  salt: "salt",
                  issuer: "issuer",
                  hashed_client_secret: "hashedSecret",
                  redirect_uri: "https://www.mockUrl.com",
                },
                {
                  client_id: "clientId",
                  salt: "salt",
                  issuer: "issuer",
                  hashed_client_secret: "hashedSecret",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getRegisteredIssuerUsingClientSecrets(
                {
                  clientId: "mockAnotherClientId",
                  clientSecret: "mockClientSecret",
                },
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry failed schema validation",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });
      });

      describe("Credential validation", () => {
        describe("Given the client is not registered", () => {
          it("Returns false", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "mockClientId",
                  issuer: "mockIssuer",
                  salt: "mockSalt",
                  hashed_client_secret: "mockHashedClientSecret",
                  redirect_uri: "https://www.validUrl.com",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getRegisteredIssuerUsingClientSecrets(
                {
                  clientId: "unregisteredClientId",
                  clientSecret: "mockInvalidClientSecret",
                },
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client is not registered",
              errorCategory: ErrorCategory.CLIENT_ERROR,
            });
          });
        });

        describe("Given the client credentials are invalid", () => {
          it("Returns false", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "mockAnotherClientId",
                  issuer: "mockIssuer",
                  salt: "0vjPs=djeEHP",
                  hashed_client_secret: "invalidHasedSecret", // mockClientSecret hashing with above salt
                  redirect_uri: "https://www.validUrl.com",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getRegisteredIssuerUsingClientSecrets(
                {
                  clientId: "mockAnotherClientId",
                  clientSecret: "mockClientSecret",
                },
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client secret is invalid",
              errorCategory: ErrorCategory.CLIENT_ERROR,
            });
          });
        });

        describe("Given the client credentials are valid", () => {
          it("Returns the issuer for the registered client", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "mockAnotherClientId",
                  issuer: "mockIssuer",
                  salt: "0vjPs=djeEHP",
                  hashed_client_secret:
                    "964adf477e02f0fd3fac7fdd08655d1e70ba142f02c946e21e1e194f49a05379", // mockClientSecret hashing with above salt
                  redirect_uri: "https://mockRedirectUri.com",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getRegisteredIssuerUsingClientSecrets(
                {
                  clientId: "mockAnotherClientId",
                  clientSecret: "mockClientSecret",
                },
              );

            expect(result.isError).toBe(false);
            expect(result.value).toBe("mockIssuer");
          });

          it("Utilizes cache for subsequent requests", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "mockClientId",
                  issuer: "mockIssuer",
                  salt: "mockSalt",
                  hashed_client_secret: "mockHashedClientSecret",
                  redirect_uri: "https://www.validUrl.com",
                },
              ]),
            });

            clientCredentialsService.resetCache();

            // First call should populate the cache
            await clientCredentialsService.getRegisteredIssuerUsingClientSecrets(
              {
                clientId: "mockAnotherClientId",
                clientSecret: "mockClientSecret",
              },
            );
            // Second call should use cache
            await clientCredentialsService.getRegisteredIssuerUsingClientSecrets(
              {
                clientId: "mockAnotherClientId",
                clientSecret: "mockClientSecret",
              },
            );

            // Expect SSM to have been called only once, since the second call uses cache
            expect(ssmMock.calls()).toHaveLength(1);
          });

          it("Refreshes cache after TTL expires", async () => {
            const ssmMock = mockClient(SecretsManagerClient);

            jest.useFakeTimers();

            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "mockClientId",
                  issuer: "mockIssuer",
                  salt: "mockSalt",
                  hashed_client_secret: "mockHashedClientSecret",
                  redirect_uri: "https://www.validUrl.com",
                },
              ]),
            });

            clientCredentialsService.resetCache();
            await clientCredentialsService.getRegisteredIssuerUsingClientSecrets(
              {
                clientId: "mockAnotherClientId",
                clientSecret: "mockClientSecret",
              },
            );
            // Simulate time passing to exceed cache TTL
            jest.advanceTimersByTime(clientCredentialsService.cacheTTL + 1);
            // This call should refresh cache
            await clientCredentialsService.getRegisteredIssuerUsingClientSecrets(
              {
                clientId: "mockAnotherClientId",
                clientSecret: "mockClientSecret",
              },
            );

            // Expect SSM to have been called twice: once to populate, once to refresh after TTL
            expect(ssmMock.calls()).toHaveLength(2);
            jest.useRealTimers();
          });
        });
      });
    });
  });

  describe("Get issuer and redirect_uri from client id", () => {
    describe("Given there is an unexpected error retrieving the client registry", () => {
      it("Returns error result", async () => {
        const ssmMock = mockClient(SecretsManagerClient);
        ssmMock.on(GetSecretValueCommand).rejects("SSM Error");

        const result =
          await clientCredentialsService.getPartialRegisteredClientByClientId(
            "mockClientId",
          );

        expect(result.isError).toBe(true);
        expect(result.value).toStrictEqual({
          errorMessage: "Error retrieving client secrets",
          errorCategory: ErrorCategory.SERVER_ERROR,
        });
      });
    });

    describe("Given the client registry is successfully retrieved", () => {
      describe("Schema validation", () => {
        describe("Given no client registry was found", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({});

            const result =
              await clientCredentialsService.getPartialRegisteredClientByClientId(
                "mockClientId",
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry not found",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });

        describe("Given client registry is not a valid JSON", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: "{{{",
            });

            const result =
              await clientCredentialsService.getPartialRegisteredClientByClientId(
                "mockClientId",
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry is not a valid JSON",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });

        describe("Given client registry is not an array", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: "{}",
            });

            const result =
              await clientCredentialsService.getPartialRegisteredClientByClientId(
                "mockClientId",
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry is not an array",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });
        describe("Given client registry is empty", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: "[]",
            });

            const result =
              await clientCredentialsService.getPartialRegisteredClientByClientId(
                "mockClientId",
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry is empty",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });
        describe("Given the clientId is missing", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  issuer: "mockIssuer",
                  salt: "0vjPs=djeEHP",
                  hashed_client_secret:
                    "964adf477e02f0fd3fac7fdd08655d1e70ba142f02c946e21e1e194f49a05379", // mockClientSecret hashing with above salt
                  redirect_uri: "https://mockRedirectUri.com",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getPartialRegisteredClientByClientId(
                "mockClientId",
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry failed schema validation",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });

        describe("Given the clientId is not a string", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: 1,
                  issuer: "mockIssuer",
                  salt: "0vjPs=djeEHP",
                  hashed_client_secret:
                    "964adf477e02f0fd3fac7fdd08655d1e70ba142f02c946e21e1e194f49a05379", // mockClientSecret hashing with above salt
                  redirect_uri: "https://mockRedirectUri.com",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getPartialRegisteredClientByClientId(
                "mockClientId",
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry failed schema validation",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });

        describe("Given the salt is missing", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "clientId",
                  issuer: "mockIssuer",
                  hashed_client_secret:
                    "964adf477e02f0fd3fac7fdd08655d1e70ba142f02c946e21e1e194f49a05379", // mockClientSecret hashing with above salt
                  redirect_uri: "https://mockRedirectUri.com",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getPartialRegisteredClientByClientId(
                "mockClientId",
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry failed schema validation",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });
        describe("Given the salt is not a string", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "clientId",
                  salt: 1,
                  issuer: "mockIssuer",
                  hashed_client_secret:
                    "964adf477e02f0fd3fac7fdd08655d1e70ba142f02c946e21e1e194f49a05379", // mockClientSecret hashing with above salt
                  redirect_uri: "https://mockRedirectUri.com",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getPartialRegisteredClientByClientId(
                "mockClientId",
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry failed schema validation",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });

        describe("Given the issuer is missing", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "clientId",
                  salt: "salt",
                  hashed_client_secret:
                    "964adf477e02f0fd3fac7fdd08655d1e70ba142f02c946e21e1e194f49a05379", // mockClientSecret hashing with above salt
                  redirect_uri: "https://mockRedirectUri.com",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getPartialRegisteredClientByClientId(
                "mockClientId",
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry failed schema validation",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });

        describe("Given the issuer is not a string", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "clientId",
                  salt: "salt",
                  issuer: 1,
                  hashed_client_secret:
                    "964adf477e02f0fd3fac7fdd08655d1e70ba142f02c946e21e1e194f49a05379", // mockClientSecret hashing with above salt
                  redirect_uri: "https://mockRedirectUri.com",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getPartialRegisteredClientByClientId(
                "mockClientId",
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry failed schema validation",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });

        describe("Given the hashed client secret is missing", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "clientId",
                  salt: "salt",
                  issuer: "issuer",
                  redirect_uri: "https://mockRedirectUri.com",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getPartialRegisteredClientByClientId(
                "mockClientId",
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry failed schema validation",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });

        describe("Given the hashed client secret is not a string", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "clientId",
                  salt: "salt",
                  issuer: "issuer",
                  hashed_client_secret: 1,
                  redirect_uri: "https://mockRedirectUri.com",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getPartialRegisteredClientByClientId(
                "mockClientId",
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry failed schema validation",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });

        describe("Given the redirect_uri is missing", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "clientId",
                  salt: "salt",
                  issuer: "issuer",
                  hashed_client_secret: "hashedSecret",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getPartialRegisteredClientByClientId(
                "mockClientId",
              );
            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry failed schema validation",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });

        describe("Given the redirect_uri is not a URL", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "clientId",
                  salt: "salt",
                  issuer: "issuer",
                  hashed_client_secret: "hashedSecret",
                  redirect_uri: "invalidUrl",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getPartialRegisteredClientByClientId(
                "mockClientId",
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry failed schema validation",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });

        describe("Given more than one registered client fails validation", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "clientId",
                  salt: "salt",
                  issuer: "issuer",
                  hashed_client_secret: "hashedSecret",
                },
                {
                  client_id: "clientId",
                  salt: "salt",
                  issuer: "issuer",
                  hashed_client_secret: "hashedSecret",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getPartialRegisteredClientByClientId(
                "mockClientId",
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry failed schema validation",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });

        describe("Given only one registered client fails validation", () => {
          it("Returns error result", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "clientId",
                  salt: "salt",
                  issuer: "issuer",
                  hashed_client_secret: "hashedSecret",
                  redirect_uri: "https://www.mockUrl.com",
                },
                {
                  client_id: "clientId",
                  salt: "salt",
                  issuer: "issuer",
                  hashed_client_secret: "hashedSecret",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getPartialRegisteredClientByClientId(
                "mockClientId",
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client registry failed schema validation",
              errorCategory: ErrorCategory.SERVER_ERROR,
            });
          });
        });
      });

      describe("Credential validation", () => {
        describe("Given the client is not registered", () => {
          it("Returns false", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "mockClientId",
                  issuer: "mockIssuer",
                  salt: "mockSalt",
                  hashed_client_secret: "mockHashedClientSecret",
                  redirect_uri: "https://www.validUrl.com",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getPartialRegisteredClientByClientId(
                "unregisteredClientId",
              );

            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Client is not registered",
              errorCategory: ErrorCategory.CLIENT_ERROR,
            });
          });
        });

        describe("Given the client is registered", () => {
          it("Returns the issuer and redirect_uri for the registered client", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "mockRegisteredClientId",
                  issuer: "mockIssuer",
                  salt: "0vjPs=djeEHP",
                  hashed_client_secret:
                    "964adf477e02f0fd3fac7fdd08655d1e70ba142f02c946e21e1e194f49a05379", // mockClientSecret hashing with above salt
                  redirect_uri: "https://mockRedirectUri.com",
                },
              ]),
            });

            const result =
              await clientCredentialsService.getPartialRegisteredClientByClientId(
                "mockRegisteredClientId",
              );

            expect(result.isError).toBe(false);
            expect(result.value).toStrictEqual({
              issuer: "mockIssuer",
              redirectUri: "https://mockRedirectUri.com",
            });
          });

          it("Utilizes cache for subsequent requests", async () => {
            const ssmMock = mockClient(SecretsManagerClient);
            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "mockRegisteredClientId",
                  issuer: "mockIssuer",
                  salt: "mockSalt",
                  hashed_client_secret: "mockHashedClientSecret",
                  redirect_uri: "https://www.validUrl.com",
                },
              ]),
            });

            clientCredentialsService.resetCache();

            // First call should populate the cache
            await clientCredentialsService.getPartialRegisteredClientByClientId(
              "mockRegisteredClientId",
            );
            // Second call should use cache
            await clientCredentialsService.getPartialRegisteredClientByClientId(
              "mockRegisteredClientId",
            );

            // Expect SSM to have been called only once, since the second call uses cache
            expect(ssmMock.calls()).toHaveLength(1);
          });

          it("Refreshes cache after TTL expires", async () => {
            const ssmMock = mockClient(SecretsManagerClient);

            jest.useFakeTimers();

            ssmMock.on(GetSecretValueCommand).resolves({
              SecretString: JSON.stringify([
                {
                  client_id: "mockRegisteredClientId",
                  issuer: "mockIssuer",
                  salt: "mockSalt",
                  hashed_client_secret: "mockHashedClientSecret",
                  redirect_uri: "https://www.validUrl.com",
                },
              ]),
            });

            clientCredentialsService.resetCache();
            await clientCredentialsService.getPartialRegisteredClientByClientId(
              "mockRegisteredClientId",
            );
            // Simulate time passing to exceed cache TTL
            jest.advanceTimersByTime(clientCredentialsService.cacheTTL + 1);
            // This call should refresh cache
            await clientCredentialsService.getPartialRegisteredClientByClientId(
              "mockRegisteredClientId",
            );

            // Expect SSM to have been called twice: once to populate, once to refresh after TTL
            expect(ssmMock.calls()).toHaveLength(2);
            jest.useRealTimers();
          });
        });
      });
    });
  });
});
