import {
  DecryptCommand,
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
            errorMessage:
              "Decrypt service token failure: JWE does not consist of five components",
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
      describe("Given kid is not present in JWKS", () => {
        it("Returns error result", async () => {
          const kmsMock = mockClient(KMSClient);
          kmsMock.on(DecryptCommand).resolves({
            $metadata: {
              httpStatusCode: 200,
              requestId: "bed04b9f-163d-451d-baf6-fc892e586972",
              extendedRequestId: undefined,
              cfId: undefined,
              attempts: 1,
              totalRetryDelay: 0,
            },
            EncryptionAlgorithm: "RSAES_OAEP_SHA_256",
            KeyId:
              "arn:aws:kms:eu-west-2:211125300205:key/7f6d8b26-8089-462a-9ff5-d1af8eb2e7a1",
            Plaintext: new Uint8Array([
              206, 38, 204, 170, 46, 201, 136, 104, 62, 25, 208, 99, 129, 151,
              132, 145, 193, 80, 218, 195, 201, 168, 7, 1, 255, 30, 215, 58, 84,
              51, 47, 78,
            ]),
          });

          const result = await tokenService.getSubFromToken(
            "https://mockJwksEndpoint.com",
            "https://mockEncryptionKeyArn.com",
            "eyJhbGciOiJSU0EtT0FFUC0yNTYiLCJlbmMiOiJBMjU2R0NNIn0.TbpJTOgSQ0svK6eh0ZBS_jl-ebU9DFK99YA_qaOo5aafy-XiFXvi_Vc19zmzMHafn0mi0GSU2PkJd3jV-QcJOoS-ZCJ14rwHhsiO1YSvU3pEiflDNrslT24yTCd4DeMGAdJaZNOpBAb1In04c2VgbtvMQkpKvkvZ6xb_07-MU6jQPgzknWH4DQnaJ5hWplsAudqDzp2cCyOW5YRm4huSVWxLbMJccHee9BgUtFfhzzHxBYrfvpN8q-gMveiQfZJvEVqfIR8n5zzdybmfpasTbcXEPAmkoLpvjgTm6HKYnoodXfSwr9p1SCIFzEZQd9JF9WSrIA_LRHPwjTtLHiKjUg.ILKKprrdKL4pNmVJ.dr-7Mohe0_3C9T-3cFP9-ABmmy861rO1rwRrGYgyaPZqSRPlIIut-UWPAz3XN9XM1rpYoqV3r5wZzkR5ezgDIk0VxzSBvvx6o57LvH-uq-yIBafGaaXm3Vcl0bqyMnkW26aB1UzxJUSayOqNJyo8SCvqPmdwBdoP2KbpoUZ8zJHnYIJOsyPcXc7gGk5O-q6OUyNzFlDM1QM9W7PtRAKcZOnV3CGcI8EJSRwSOnNFlVLv4Kh9_0f4dH0jOMrz2Zb4Nta1gCBsfEVdM80rWRwZplp7p64gfLh16T_NTwsfW-d-F69gpf3umtHs6AR6byWUOcxDH6RKee5xrJxqIrQuP352p3DMekvDtVbIC_mwdqhci7Rg5lIlrRfv4UwqUw5CI167MfZl9HtR47lVz-jKuBEldEKYrlcxEJvYwT2ctWHL3ZlBnRC44a81E588Rr7Wz2W0paRk0X0_rRcHeDwbsIOXZpp193WrcylhPoS5Uw7Q6jDW4fluOPfT6WjZQKbu3qLEMrwMNiNtHWmqkHQLxbYVlFxJgd0zl8y_Ge4z8YzaSjApXF5u41kZWoSTB2q5_R0ICgQQpUSQ1yuAIKgiml92li2eY5FQlaqDj2KVe-zgm2ZLjjcjTyUSccPBoqMayY6wqZW5.XF1Jo9QvkYqtOJFLC1UAaA",
            { maxAttempts: 3, delayInMillis: 1 },
          );

          expect(result.isError).toBe(true);
          expect(result.value).toStrictEqual({
            errorMessage:
              "Failed verifying service token signature: kid not found.",
            errorCategory: "CLIENT_ERROR",
          });
        });
      });
    });
  });
});
