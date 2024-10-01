import {
  DecryptCommand,
  InvalidCiphertextException,
  KeyUnavailableException,
  KMSClient,
} from "@aws-sdk/client-kms";
import { ITokenService, TokenService } from "../tokenService";
import { mockClient } from "aws-sdk-client-mock";

describe("Token Service", () => {
  let mockFetch: jest.SpyInstance;
  let tokenService: ITokenService;

  beforeEach(() => {
    tokenService = new TokenService();
    mockFetch = jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        status: 200,
        ok: true,
        json: () =>
          Promise.resolve({
            keys: [
              {
                kty: "mockKty",
                x: "mockX",
                y: "mockY",
                crv: "mockCrv",
                d: "mockD",
                kid: "mockKid",
              },
            ],
          }),
      } as Response),
    );
  });

  afterEach(() => {
    mockFetch.mockRestore();
  });

  describe("Get Sub From Token", () => {
    describe("Retrieving STS public key", () => {
      describe("Given there is an error retrieving the public key", () => {
        describe("Given there is a network error", () => {
          it("Returns error result", async () => {
            mockFetch = jest
              .spyOn(global, "fetch")
              .mockImplementation(() => Promise.reject(new Error("mockError")));

            const result = await tokenService.getSubFromToken(
              "https://mockJwksEndpoint.com",
              "mockEncryptionKeyArn",
              "mockJwe",
            );

            expect(mockFetch).toHaveBeenCalledWith(
              "https://mockJwksEndpoint.com",
              {
                method: "GET",
              },
            );
            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Unexpected error retrieving STS public key",
              errorCategory: "SERVER_ERROR",
            });
          });
        });

        describe("Given the request fails with a 500 error", () => {
          it("Returns error result", async () => {
            mockFetch = jest.spyOn(global, "fetch").mockImplementation(() =>
              Promise.resolve({
                status: 500,
                ok: false,
              } as Response),
            );

            const result = await tokenService.getSubFromToken(
              "https://mockJwksEndpoint.com",
              "mockEncryptionKeyArn",
              "mockJwe",
            );

            expect(mockFetch).toHaveBeenCalledWith(
              "https://mockJwksEndpoint.com",
              {
                method: "GET",
              },
            );
            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Error retrieving STS public key",
              errorCategory: "SERVER_ERROR",
            });
          });
        });

        describe("Given the response is not valid JSON", () => {
          it("Returns an error response", async () => {
            mockFetch = jest.spyOn(global, "fetch").mockImplementation(() =>
              Promise.resolve({
                status: 200,
                ok: true,
                json: () => Promise.reject(new Error("mockInvalidJSON")),
              } as Response),
            );

            const result = await tokenService.getSubFromToken(
              "https://mockJwksEndpoint.com",
              "mockEncryptionKeyArn",
              "mockJwe",
            );

            expect(mockFetch).toHaveBeenCalledWith(
              "https://mockJwksEndpoint.com",
              {
                method: "GET",
              },
            );
            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Invalid JSON in response",
              errorCategory: "SERVER_ERROR",
            });
          });
        });
      });
    });

    describe("Decrypting token", () => {
      describe("Given the JWE does not consist of five components", () => {
        it("Returns an error result", async () => {
          const result = await tokenService.getSubFromToken(
            "https://mockJwksEndpoint.com",
            "mockEncryptionKeyArn",
            "one.two.three.four",
          );

          expect(result.isError).toBe(true);
          expect(result.value).toStrictEqual({
            errorMessage: "JWE does not consist of five components",
            errorCategory: "CLIENT_ERROR",
          });
        });
      });

      describe("Given the encrypted key is invalid and cannot be decrypted", () => {
        it("Returns an error result", async () => {
          const kmsMock = mockClient(KMSClient);
          kmsMock.on(DecryptCommand).rejects(
            new InvalidCiphertextException({
              $metadata: {},
              message: "message",
            }),
          );

          const result = await tokenService.getSubFromToken(
            "https://mockJwksEndpoint.com",
            "mockEncryptionKeyArn",
            "one.two.three.four.five",
          );

          expect(result.isError).toBe(true);
          expect(result.value).toStrictEqual({
            errorMessage:
              "Encrypted data could not be decrypted with provided key",
            errorCategory: "CLIENT_ERROR",
          });
        });
      });

      describe("Given there is an unexpected error when calling KMS to decrypt the key", () => {
        it("Returns an error result", async () => {
          const kmsMock = mockClient(KMSClient);
          kmsMock.on(DecryptCommand).rejects(
            new KeyUnavailableException({
              $metadata: {},
              message: "message",
            }),
          );

          const result = await tokenService.getSubFromToken(
            "https://mockJwksEndpoint.com",
            "mockEncryptionKeyArn",
            "one.two.three.four.five",
          );

          expect(result.isError).toBe(true);
          expect(result.value).toStrictEqual({
            errorMessage: "Error decrypting data with KMS",
            errorCategory: "SERVER_ERROR",
          });
        });
      });

      describe("Given KMS response does not include Plaintext value", () => {
        it("Returns error result", async () => {
          const kmsMock = mockClient(KMSClient);
          kmsMock.on(DecryptCommand).resolves({});

          const result = await tokenService.getSubFromToken(
            "https://mockJwksEndpoint.com",
            "mockEncryptionKeyArn",
            "one.two.three.four.five",
          );

          expect(result.isError).toBe(true);
          expect(result.value).toStrictEqual({
            errorMessage: "Decrypted plaintext data was null",
            errorCategory: "SERVER_ERROR",
          });
        });
      });
    });
  });
});
