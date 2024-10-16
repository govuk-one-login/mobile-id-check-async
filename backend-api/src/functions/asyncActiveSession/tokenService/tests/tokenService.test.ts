import {
  ITokenService,
  ITokenServiceDependencies,
  TokenService,
} from "../tokenService";
import {
  MockPubicKeyGetterGetPublicKeyError,
  MockPubicKeyGetterGetPublicKeySuccess,
  MockTokenVerifierVerifyError,
  MockTokenVerifierVerifySuccess,
} from "./mocks";

describe("Token Service", () => {
  let mockFetch: jest.SpyInstance;
  let tokenService: ITokenService;
  let dependencies: ITokenServiceDependencies;

  beforeEach(() => {
    dependencies = {
      publicKeyGetter: () => new MockPubicKeyGetterGetPublicKeySuccess(),
      tokenVerifier: () => new MockTokenVerifierVerifySuccess(),
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
              { maxAttempts: 3, delayInMillis: 1 },
              "dummy.signed.token",
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
              { maxAttempts: 3, delayInMillis: 1 },
              "dummy.signed.token",
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
              { maxAttempts: 3, delayInMillis: 1 },
              "dummy.signed.token",
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
              { maxAttempts: 3, delayInMillis: 1 },
              "dummy.signed.token",
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
              { maxAttempts: 3, delayInMillis: 1 },
              "dummy.signed.token",
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
                { maxAttempts: 3, delayInMillis: 1 },
                "dummy.signed.token",
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
                { maxAttempts: 3, delayInMillis: 1 },
                "dummy.signed.token",
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
                { maxAttempts: 3, delayInMillis: 1 },
                "dummy.signed.token",
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

    describe("Token signature verification", () => {
      describe("Given there is an error getting public key from JWKS (e.g. kid from JWT header is not found in JWKS)", () => {
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
                        crv: "mockCrv",
                        d: "mockD",
                        kty: "mockKty",
                        x: "mockX",
                        y: "mockY",
                      },
                    ],
                  }),
                ),
            } as Response),
          );
          const result = await tokenService.getSubFromToken(
            "https://mockJwksEndpoint.com",
            { maxAttempts: 3, delayInMillis: 1 },
            "dummy.signed.token",
          );

          expect(result.isError).toBe(true);
          expect(result.value).toStrictEqual({
            errorMessage: "Failed to get public key",
            errorCategory: "CLIENT_ERROR",
          });
        });
      });

      describe("Given there is an error verifying token signature", () => {
        it("Returns error result", async () => {
          dependencies.tokenVerifier = () => new MockTokenVerifierVerifyError();
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
                        crv: "mockCrv",
                        d: "mockD",
                        kid: "mockKid",
                        kty: "mockKty",
                        x: "mockX",
                        y: "mockY",
                      },
                    ],
                  }),
                ),
            } as Response),
          );
          const result = await tokenService.getSubFromToken(
            "https://mockJwksEndpoint.com",
            { maxAttempts: 3, delayInMillis: 1 },
            "dummy.signed.token",
          );

          expect(result.isError).toBe(true);
          expect(result.value).toStrictEqual({
            errorMessage: "Error verifying token signature",
            errorCategory: "CLIENT_ERROR",
          });
        });
      });
    });
  });
});
