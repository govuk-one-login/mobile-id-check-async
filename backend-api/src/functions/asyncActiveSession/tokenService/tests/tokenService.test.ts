import {
  DecryptCommand,
  KeyUnavailableException,
  KMSClient,
} from "@aws-sdk/client-kms";
import { ITokenService, TokenService } from "../tokenService";
import { mockClient } from "aws-sdk-client-mock";
import { KMSAdapter } from "../../../adapters/kmsAdapter";

describe("Token Service", () => {
  let mockFetch: jest.SpyInstance;
  let tokenService: ITokenService;

  beforeEach(() => {
    tokenService = new TokenService(new KMSAdapter("mockEncryptionKeyArn"));
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
              errorMessage: "Unexpected error retrieving STS public keys",
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
              errorMessage: "Error retrieving STS public keys",
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

        describe("Given the response is not in the shape of a public key", () => {
          it("Returns an error response", async () => {
            mockFetch = jest.spyOn(global, "fetch").mockImplementation(() =>
              Promise.resolve({
                status: 200,
                ok: true,
                json: () =>
                  Promise.resolve({
                    keys: ["mockNotAnObject"],
                  }),
              } as Response),
            );

            const result = await tokenService.getSubFromToken(
              "https://mockJwksEndpoint.com",
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
              errorMessage:
                "Response does not match the expected JWKS structure",
              errorCategory: "SERVER_ERROR",
            });
          });
        });

        describe("Retry policy", () => {
          describe("Given there is an error retrieving the public key on the first attempt", () => {
            it("Makes second attempt to get STS key", async () => {
              mockFetch = jest
                .spyOn(global, "fetch")
                .mockImplementationOnce(() =>
                  Promise.reject(new Error("mockError")),
                )
                .mockImplementationOnce(() =>
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

              await tokenService.getSubFromToken(
                "https://mockJwksEndpoint.com",
                "mockJwe",
              );

              expect(mockFetch).toHaveBeenCalledWith(
                "https://mockJwksEndpoint.com",
                {
                  method: "GET",
                },
              );
              expect(mockFetch).toHaveBeenCalledTimes(2);
            });
          });

          describe("Given there is an error retrieving the public key on the second attempt", () => {
            it("Makes third attempt to get STS key", async () => {
              mockFetch = jest
                .spyOn(global, "fetch")
                .mockImplementationOnce(() =>
                  Promise.reject(new Error("mockError")),
                )
                .mockImplementationOnce(() =>
                  Promise.reject(new Error("mockError")),
                )
                .mockImplementationOnce(() =>
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

              await tokenService.getSubFromToken(
                "https://mockJwksEndpoint.com",
                "mockJwe",
              );

              expect(mockFetch).toHaveBeenCalledWith(
                "https://mockJwksEndpoint.com",
                {
                  method: "GET",
                },
              );
              expect(mockFetch).toHaveBeenCalledTimes(3);
            });
          });

          describe("Given there is an error retrieving the public key on the third attempt", () => {
            it("Returns error result", async () => {
              mockFetch = jest
                .spyOn(global, "fetch")
                .mockImplementationOnce(() =>
                  Promise.reject(new Error("mockError")),
                )
                .mockImplementationOnce(() =>
                  Promise.reject(new Error("mockError")),
                )
                .mockImplementationOnce(() =>
                  Promise.reject(new Error("mockError")),
                );

              const result = await tokenService.getSubFromToken(
                "https://mockJwksEndpoint.com",
                "mockJwe",
              );

              expect(mockFetch).toHaveBeenCalledWith(
                "https://mockJwksEndpoint.com",
                {
                  method: "GET",
                },
              );
              expect(mockFetch).toHaveBeenCalledTimes(3);

              expect(result.isError).toBe(true);
              expect(result.value).toStrictEqual({
                errorMessage: "Unexpected error retrieving STS public keys",
                errorCategory: "SERVER_ERROR",
              });
            });
          });
        });
      });
    });

    describe("Decrypting token", () => {
      describe("Given the JWE does not consist of five components", () => {
        it("Returns an error result", async () => {
          const kmsMock = mockClient(KMSClient);
          kmsMock.on(DecryptCommand).resolves({});

          const result = await tokenService.getSubFromToken(
            "https://mockJwksEndpoint.com",
            "one.two.three.four",
          );

          expect(result.isError).toBe(true);
          expect(result.value).toStrictEqual({
            errorMessage: "JWE does not consist of five components",
            errorCategory: "CLIENT_ERROR",
          });
        });
      });

      describe("Given there is a server error when calling KMS", () => {
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
            "one.two.three.four.five",
          );

          expect(result.isError).toBe(true);
          expect(result.value).toStrictEqual({
            errorMessage: "Error decrypting key with KMS",
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
            "one.two.three.four.five",
          );

          expect(result.isError).toBe(true);
          expect(result.value).toStrictEqual({
            errorMessage:
              "No Plaintext received when calling KMS to decrypt the Content Encryption Key",
            errorCategory: "SERVER_ERROR",
          });
        });
      });
    });
  });
});
