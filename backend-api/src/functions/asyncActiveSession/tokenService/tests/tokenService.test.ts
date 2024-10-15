import {
  DecryptCommand,
  KeyUnavailableException,
  KMSClient,
} from "@aws-sdk/client-kms";
import {
  ITokenService,
  ITokenServiceDependencies,
  TokenService,
} from "../tokenService";
import { mockClient } from "aws-sdk-client-mock";
import {
  MockPubicKeyGetterGetPublicKeyError,
  MockPubicKeyGetterGetPublicKeySuccess,
  MockTokenVerifierVerifySuccess,
} from "./mocks";

describe("Token Service", () => {
  let mockFetch: jest.SpyInstance;
  let tokenService: ITokenService;
  let dependencies: ITokenServiceDependencies;

  beforeEach(() => {
    dependencies = {
      publicKeyGetter: () => new MockPubicKeyGetterGetPublicKeySuccess(),
      tokenVerifier: () => new MockTokenVerifierVerifySuccess()
    };
    tokenService = new TokenService(dependencies);
    mockFetch = jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        status: 200,
        ok: true,
        headers: new Headers({
          header: "mockHeader",
        }),
        text: () =>
          Promise.resolve(
            JSON.stringify({
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
          ),
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
              { maxAttempts: 3, delayInMillis: 1 },
            );

            expect(mockFetch).toHaveBeenCalledWith(
              "https://mockJwksEndpoint.com",
              {
                method: "GET",
              },
            );
            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Unexpected network error: Error: mockError",
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
                text: () => Promise.resolve("mockErrorInformaton"),
              } as Response),
            );

            const result = await tokenService.getSubFromToken(
              "https://mockJwksEndpoint.com",
              "mockEncryptionKeyArn",
              "mockJwe",
              { maxAttempts: 3, delayInMillis: 1 },
            );

            expect(mockFetch).toHaveBeenCalledWith(
              "https://mockJwksEndpoint.com",
              {
                method: "GET",
              },
            );
            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Error making http request: mockErrorInformaton",
              errorCategory: "SERVER_ERROR",
            });
          });
        });

        describe("Given the response is empty", () => {
          it("Returns an error response", async () => {
            mockFetch = jest.spyOn(global, "fetch").mockImplementation(() =>
              Promise.resolve({
                status: 200,
                ok: true,
                headers: new Headers({
                  header: "mockHeader",
                }),
                text: () => Promise.resolve(""),
              } as Response),
            );

            const result = await tokenService.getSubFromToken(
              "https://mockJwksEndpoint.com",
              "mockEncryptionKeyArn",
              "mockJwe",
              { maxAttempts: 3, delayInMillis: 1 },
            );

            expect(mockFetch).toHaveBeenCalledWith(
              "https://mockJwksEndpoint.com",
              {
                method: "GET",
              },
            );
            expect(result.isError).toBe(true);
            expect(result.value).toStrictEqual({
              errorMessage: "Response body empty",
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
                headers: new Headers({
                  header: "mockHeader",
                }),
                text: () => Promise.resolve("undefined"),
              } as Response),
            );

            const result = await tokenService.getSubFromToken(
              "https://mockJwksEndpoint.com",
              "mockEncryptionKeyArn",
              "mockJwe",
              { maxAttempts: 3, delayInMillis: 1 },
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
                headers: new Headers({
                  header: "mockHeader",
                }),
                text: () =>
                  Promise.resolve(
                    JSON.stringify({
                      keys: ["mockNotAnObject"],
                    }),
                  ),
              } as Response),
            );

            const result = await tokenService.getSubFromToken(
              "https://mockJwksEndpoint.com",
              "mockEncryptionKeyArn",
              "mockJwe",
              { maxAttempts: 3, delayInMillis: 1 },
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
                    headers: new Headers({
                      header: "mockHeader",
                    }),
                    text: () =>
                      Promise.resolve(
                        JSON.stringify({
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
                      ),
                  } as Response),
                );

              await tokenService.getSubFromToken(
                "https://mockJwksEndpoint.com",
                "mockEncryptionKeyArn",
                "mockJwe",
                { maxAttempts: 3, delayInMillis: 1 },
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
                    headers: new Headers({
                      header: "mockHeader",
                    }),
                    text: () =>
                      Promise.resolve(
                        JSON.stringify({
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
                      ),
                  } as Response),
                );

              await tokenService.getSubFromToken(
                "https://mockJwksEndpoint.com",
                "mockEncryptionKeyArn",
                "mockJwe",
                { maxAttempts: 3, delayInMillis: 1 },
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
                "mockEncryptionKeyArn",
                "mockJwe",
                { maxAttempts: 3, delayInMillis: 1 },
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
                errorMessage: "Unexpected network error: Error: mockError",
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
          const result = await tokenService.getSubFromToken(
            "https://mockJwksEndpoint.com",
            "mockEncryptionKeyArn",
            "one.two.three.four",
            { maxAttempts: 3, delayInMillis: 1 },
          );

          expect(result.isError).toBe(true);
          expect(result.value).toStrictEqual({
            errorMessage: "JWE does not consist of five components",
            errorCategory: "CLIENT_ERROR",
          });
        });
      });

      describe("Given an error happens when calling KMS to decrypt the key", () => {
        it("Returns a SERVER_ERROR error result", async () => {
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
            { maxAttempts: 3, delayInMillis: 1 },
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
            { maxAttempts: 3, delayInMillis: 1 },
          );

          expect(result.isError).toBe(true);
          expect(result.value).toStrictEqual({
            errorMessage: "Decrypted plaintext data was null",
            errorCategory: "SERVER_ERROR",
          });
        });
      });

      describe("Given converting CEK to CryptoKey fails", () => {
        it("Returns error result", async () => {
          const kmsMock = mockClient(KMSClient);
          kmsMock.on(DecryptCommand).resolves({ Plaintext: new Uint8Array() });

          const result = await tokenService.getSubFromToken(
            "https://mockJwksEndpoint.com",
            "mockEncryptionKeyArn",
            "one.two.three.four.five",
            { maxAttempts: 3, delayInMillis: 1 },
          );

          expect(result.isError).toBe(true);
          expect(result.value).toStrictEqual({
            errorMessage:
              "Error converting cek to CryptoKey. DataError: Invalid key length",
            errorCategory: "SERVER_ERROR",
          });
        });
      });

      describe("Given decrypting JWE fails", () => {
        it("Returns error result", async () => {
          const buffer = new ArrayBuffer(16);
          const kmsMock = mockClient(KMSClient);
          kmsMock
            .on(DecryptCommand)
            .resolves({ Plaintext: new Uint8Array(buffer) });

          const result = await tokenService.getSubFromToken(
            "https://mockJwksEndpoint.com",
            "mockEncryptionKeyArn",
            "one.two.three.four.five",
            { maxAttempts: 3, delayInMillis: 1 },
          );

          expect(result.isError).toBe(true);
          expect(result.value).toStrictEqual({
            errorMessage:
              "Error decrypting JWE. OperationError: The provided data is too small.",
            errorCategory: "SERVER_ERROR",
          });
        });
      });
    });

    describe("Token signature verification", () => {
      describe("Given kid from JWT header is not found in JWKS", () => {
        it("Returns error result", async () => {
          dependencies.publicKeyGetter = () =>
            new MockPubicKeyGetterGetPublicKeyError();
          tokenService = new TokenService(dependencies);
          jest.spyOn(global, "fetch").mockImplementation(() =>
            Promise.resolve({
              status: 200,
              ok: true,
              headers: new Headers({
                header: "mockHeader",
              }),
              text: () =>
                Promise.resolve(
                  JSON.stringify({
                    keys: [
                      {
                        kty: "mockKty",
                        x: "mockX",
                        y: "mockY",
                        crv: "mockCrv",
                        d: "mockD",
                      },
                    ],
                  }),
                ),
            } as Response),
          );
          const kmsMock = mockClient(KMSClient);
          kmsMock.on(DecryptCommand).resolves({
            Plaintext: new Uint8Array([
              32, 246, 101, 201, 76, 14, 171, 166, 187, 133, 5, 20, 88, 166, 67,
              87, 219, 77, 117, 132, 24, 205, 191, 201, 17, 37, 209, 89, 227,
              142, 98, 12,
            ]),
          });
          const result = await tokenService.getSubFromToken(
            "https://mockJwksEndpoint.com",
            "https://mockKeyArn.com",
            "eyJhbGciOiJSU0EtT0FFUC0yNTYiLCJlbmMiOiJBMjU2R0NNIn0.gIpE-M0GXa5em7kWpV-UqfPDQZX1y0z55qx4YpBX5fJO3qc3EBNCaMaGn8Tc1wol0IWconi-zPq5189o8Ln-bor9JFqG5JBj14ZbsPe4Zl5kAi3uouJo3x_JhGI9pxtUVJpBBsXEMk1c6snipJoObWautKUVn5Tz6Z7mAynycGDNMOagOfVOKseAKr22n6Mo7vffENgKBE6b8RQoq5E3XaEUKJTLU_HIRKKNTZv91QDZI7J6Awy1FVoBbILYXyaQ5JRvupm8i6hGzf6ONNeUOhQTFDJWWt8L29mnYm24Iapaz00moAjuO0BYuyRfFmnmzjPHbvzadXSl4v2Ks8AMuQ.zZi9c9a7uPc6oPhT.m4eKptOJBmtkZiu6z6arzE6CNNBEPYJXDeiFQPXl9RNm2whME9zsUSD-DJvGkuvHpuQU6qgmnk5yBgy9M7KbhByeMY46iQyTcgMVC0QPgzrzdCk5cq8zpI1oBrBqax21oqpAVkhLzr5aL96eyfmmqBOxch-ew_XxWD_fsNPA53PL4rK4CCHRRIJ2KMvRN7-NlPqeIfuSaNTDA7g4ScDqOz4udbjHp4tGHxOxWn7lZLiFGIf4XRiMPhNDfz0L1wS6DtZEzy1ZtHgORF9w0SvSOZvJb1YF7HwxAGCAwNB4Qs_igPl2bbCsd5vOlFtUMDzt1nykS0oR23002g-Lp36DlBwpvKQ1bifb291w84afvNINe6MnWLetsmMfBjIz9fmqcTs-NjKwTOcmrS2221zzDEzbfycafk23wsocMTpsxPzX9TcedJGicVtH82vu66tQCL9tJGg57iI3esscfUVb3N7zUlkZ_xQqq1F8Il3NigiHmyJftE8KiO0MJ5qtMTHzuUbR0W7SvsMbOCgRGEbEzETYApyiCdNX_A3LvRx1edAd2vAKk5BwLXV5QE-s7QdiH3dpXwFHkFg_Y6raUPpr5pzM1FXAIbxOSY5BFPLY4GB0iYCv0yz3VoseN6JY49bg4RAVrUuv.GrExLB-mKRFXa8y4ZWgsLw",
            { maxAttempts: 3, delayInMillis: 1 },
          );

          expect(result.isError).toBe(true);
          expect(result.value).toStrictEqual({
            errorMessage: "Failed to get public key",
            errorCategory: "CLIENT_ERROR",
          });
        });
      });
    });
  });
});
