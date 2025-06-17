import { expect } from "@jest/globals";
import "../../../../../tests/testUtils/matchers";
import { getJwksFromJwksUri } from "./getJwksFromJwksUri";
import { Result } from "@govuk-one-login/mobile-id-check-biometric-credential";
import { GetJwksFromJwksUriResponse, GetKeysError } from "../types";
import {
  HttpRequest,
  ISendHttpRequest,
} from "../../../adapters/http/sendHttpRequest";
import { errorResult, successResult } from "../../../utils/result";

let result: Result<GetJwksFromJwksUriResponse, GetKeysError>;
let sendRequest: ISendHttpRequest;
let consoleDebugSpy: jest.SpyInstance;
let consoleErrorSpy: jest.SpyInstance;

const mockSendRequest = jest
  .fn<ReturnType<ISendHttpRequest>, Parameters<ISendHttpRequest>>()
  .mockResolvedValue(
    successResult({
      statusCode: 200,
      body: JSON.stringify({
        keys: [{ key1: "value1" }, { key2: "value2" }],
      }),
      headers: {
        "Cache-Control": "max-age=60",
      },
    }),
  );

describe("getJwks", () => {
  beforeEach(() => {
    sendRequest = mockSendRequest;
    consoleDebugSpy = jest.spyOn(console, "debug");
    consoleErrorSpy = jest.spyOn(console, "error");
  });

  afterEach(() => {
    consoleDebugSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("On every call", () => {
    beforeEach(async () => {
      await getJwksFromJwksUri("mock_jwks_uri", mockSendRequest);
    });

    it("Logs MOBILE_ASYNC_GET_JWKS_ATTEMPT with JWKS URI", () => {
      expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_GET_JWKS_ATTEMPT",
        data: {
          jwksUri: "mock_jwks_uri",
        },
      });
    });

    it("Sends HTTP request with correct parameters", () => {
      const expectedRequestOptions: HttpRequest = {
        url: "mock_jwks_uri",
        method: "GET",
      };
      expect(sendRequest).toHaveBeenCalledWith(expectedRequestOptions);
    });
  });

  describe("Given an error occurs getting JWKS", () => {
    describe("Given an HTTP network error occurs", () => {
      beforeEach(async () => {
        sendRequest = jest
          .fn()
          .mockResolvedValue(
            errorResult({ description: "mock_error_description" }),
          );

        result = await getJwksFromJwksUri("mock_jwks_uri", sendRequest);
      });

      it("Returns error with reason", () => {
        expect(result).toEqual({
          isError: true,
          value: {
            reason: "Error invoking JWKS endpoint",
          },
        });
      });

      it("Logs MOBILE_ASYNC_GET_JWKS_FAILURE with JWKS URI", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_GET_JWKS_FAILURE",
          data: {
            jwksUri: "mock_jwks_uri",
            description: "mock_error_description",
          },
        });
      });
    });

    describe("Given an error response is returned", () => {
      beforeEach(async () => {
        sendRequest = jest.fn().mockResolvedValue(
          errorResult({
            statusCode: 500,
            description: "mock_error_description",
          }),
        );

        result = await getJwksFromJwksUri("mock_jwks_uri", sendRequest);
      });

      it("Returns error with reason", () => {
        expect(result).toEqual({
          isError: true,
          value: {
            reason: "Error invoking JWKS endpoint",
          },
        });
      });

      it("Logs MOBILE_ASYNC_GET_JWKS_FAILURE with JWKS URI", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_GET_JWKS_FAILURE",
          data: {
            jwksUri: "mock_jwks_uri",
            description: "mock_error_description",
            statusCode: 500,
          },
        });
      });
    });

    describe("Given status code is not 200", () => {
      beforeEach(async () => {
        sendRequest = jest.fn().mockResolvedValue(
          successResult({
            statusCode: 201,
          }),
        );

        result = await getJwksFromJwksUri("mock_jwks_uri", sendRequest);
      });

      it("Returns error with reason", () => {
        expect(result).toEqual({
          isError: true,
          value: {
            reason: "JWKS endpoint returned malformed response",
          },
        });
      });

      it("Logs MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE with JWKS URI", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE",
          data: {
            jwksUri: "mock_jwks_uri",
          },
        });
      });
    });

    describe("Given response does not contain body", () => {
      beforeEach(async () => {
        sendRequest = jest.fn().mockResolvedValue(
          successResult({
            statusCode: 200,
          }),
        );

        result = await getJwksFromJwksUri("mock_jwks_uri", sendRequest);
      });

      it("Returns error with reason", () => {
        expect(result).toEqual({
          isError: true,
          value: {
            reason: "JWKS endpoint returned malformed response",
          },
        });
      });

      it("Logs MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE with JWKS URI", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE",
          data: {
            jwksUri: "mock_jwks_uri",
          },
        });
      });
    });

    describe("Given response body is not valid JSON", () => {
      beforeEach(async () => {
        sendRequest = jest.fn().mockResolvedValue(
          successResult({
            statusCode: 200,
            body: "invalid_json",
          }),
        );

        result = await getJwksFromJwksUri("mock_jwks_uri", sendRequest);
      });

      it("Returns error with reason", () => {
        expect(result).toEqual({
          isError: true,
          value: {
            reason: "JWKS endpoint returned malformed response",
          },
        });
      });

      it("Logs MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE with JWKS URI", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE",
          data: {
            jwksUri: "mock_jwks_uri",
          },
        });
      });
    });

    describe("Given response body does not include keys", () => {
      beforeEach(async () => {
        sendRequest = jest.fn().mockResolvedValue(
          successResult({
            statusCode: 200,
            body: JSON.stringify({ invalid: "object" }),
          }),
        );

        result = await getJwksFromJwksUri("mock_jwks_uri", sendRequest);
      });

      it("Returns error with reason", () => {
        expect(result).toEqual({
          isError: true,
          value: {
            reason: "JWKS endpoint returned malformed response",
          },
        });
      });

      it("Logs MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE with JWKS URI", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE",
          data: {
            jwksUri: "mock_jwks_uri",
          },
        });
      });
    });

    describe("Given keys are not an array", () => {
      beforeEach(async () => {
        sendRequest = jest.fn().mockResolvedValue(
          successResult({
            statusCode: 200,
            body: JSON.stringify({ keys: "invalid_keys" }),
          }),
        );

        result = await getJwksFromJwksUri("mock_jwks_uri", sendRequest);
      });

      it("Returns error with reason", () => {
        expect(result).toEqual({
          isError: true,
          value: {
            reason: "JWKS endpoint returned malformed response",
          },
        });
      });

      it("Logs MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE with JWKS URI", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE",
          data: {
            jwksUri: "mock_jwks_uri",
          },
        });
      });
    });

    describe("Given not all keys in array are objects", () => {
      beforeEach(async () => {
        sendRequest = jest.fn().mockResolvedValue(
          successResult({
            statusCode: 200,
            body: JSON.stringify({
              keys: [{ valid: "element" }, "invalid_element"],
            }),
          }),
        );

        result = await getJwksFromJwksUri("mock_jwks_uri", sendRequest);
      });

      it("Returns error with reason", () => {
        expect(result).toEqual({
          isError: true,
          value: {
            reason: "JWKS endpoint returned malformed response",
          },
        });
      });

      it("Logs MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE with JWKS URI", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE",
          data: {
            jwksUri: "mock_jwks_uri",
          },
        });
      });
    });

    describe("Given a key in the array is null", () => {
      beforeEach(async () => {
        sendRequest = jest.fn().mockResolvedValue(
          successResult({
            statusCode: 200,
            body: JSON.stringify({
              keys: [{ valid: "element" }, null],
            }),
          }),
        );

        result = await getJwksFromJwksUri("mock_jwks_uri", sendRequest);
      });

      it("Returns error with reason", () => {
        expect(result).toEqual({
          isError: true,
          value: {
            reason: "JWKS endpoint returned malformed response",
          },
        });
      });

      it("Logs MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE with JWKS URI", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_MALFORMED_JWKS_RESPONSE",
          data: {
            jwksUri: "mock_jwks_uri",
          },
        });
      });
    });
  });

  describe("Happy path", () => {
    describe("Given max-age is returned in Cache-Control header", () => {
      describe("Given age header is not present", () => {
        beforeEach(async () => {
          result = await getJwksFromJwksUri("mock_jwks_uri", mockSendRequest);
        });

        it("Returns success with array of keys and cache duration with value from max-age header", async () => {
          expect(result).toEqual({
            isError: false,
            value: {
              keys: [{ key1: "value1" }, { key2: "value2" }],
              cacheDurationMillis: 60000,
            },
          });
        });

        it("Logs MOBILE_ASYNC_GET_JWKS_SUCCESS with JWKS URI", async () => {
          expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_GET_JWKS_SUCCESS",
            data: {
              jwksUri: "mock_jwks_uri",
            },
          });
        });
      });

      describe("Given age header is present", () => {
        describe("Given age header is a valid value", () => {
          describe("Given the maxAge header value is greater than the age header value", () => {
            beforeEach(async () => {
              result = await getJwksFromJwksUri(
                "mock_jwks_uri",
                jest
                  .fn<
                    ReturnType<ISendHttpRequest>,
                    Parameters<ISendHttpRequest>
                  >()
                  .mockResolvedValue(
                    successResult({
                      statusCode: 200,
                      body: JSON.stringify({
                        keys: [{ key1: "value1" }, { key2: "value2" }],
                      }),
                      headers: {
                        Age: "30",
                        "Cache-Control": "max-age=60",
                      },
                    }),
                  ),
              );
            });

            it("Returns success with array of keys and cache duration with value equal to the difference between the max-age and age headers", async () => {
              expect(result).toEqual({
                isError: false,
                value: {
                  keys: [{ key1: "value1" }, { key2: "value2" }],
                  cacheDurationMillis: 30000,
                },
              });
            });

            it("Logs MOBILE_ASYNC_GET_JWKS_SUCCESS with JWKS URI", async () => {
              expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
                messageCode: "MOBILE_ASYNC_GET_JWKS_SUCCESS",
                data: {
                  jwksUri: "mock_jwks_uri",
                },
              });
            });
          });

          describe("Given the Age header value is greater than the maxAge header value", () => {
            beforeEach(async () => {
              result = await getJwksFromJwksUri(
                "mock_jwks_uri",
                jest
                  .fn<
                    ReturnType<ISendHttpRequest>,
                    Parameters<ISendHttpRequest>
                  >()
                  .mockResolvedValue(
                    successResult({
                      statusCode: 200,
                      body: JSON.stringify({
                        keys: [{ key1: "value1" }, { key2: "value2" }],
                      }),
                      headers: {
                        Age: "20",
                        "Cache-Control": "max-age=10",
                      },
                    }),
                  ),
              );
            });

            it("Returns success with array of keys and cache duration of 0", async () => {
              expect(result).toEqual({
                isError: false,
                value: {
                  keys: [{ key1: "value1" }, { key2: "value2" }],
                  cacheDurationMillis: 0,
                },
              });
            });

            it("Logs MOBILE_ASYNC_GET_JWKS_SUCCESS with JWKS URI", async () => {
              expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
                messageCode: "MOBILE_ASYNC_GET_JWKS_SUCCESS",
                data: {
                  jwksUri: "mock_jwks_uri",
                },
              });
            });
          });
        });

        describe("Given age header is a negative number", () => {
          beforeEach(async () => {
            result = await getJwksFromJwksUri(
              "mock_jwks_uri",
              jest
                .fn<
                  ReturnType<ISendHttpRequest>,
                  Parameters<ISendHttpRequest>
                >()
                .mockResolvedValue(
                  successResult({
                    statusCode: 200,
                    body: JSON.stringify({
                      keys: [{ key1: "value1" }, { key2: "value2" }],
                    }),
                    headers: {
                      Age: "-30000",
                      "Cache-Control": "max-age=60",
                    },
                  }),
                ),
            );
          });

          it("Returns success with array of keys and cache duration with value from max-age header", async () => {
            expect(result).toEqual({
              isError: false,
              value: {
                keys: [{ key1: "value1" }, { key2: "value2" }],
                cacheDurationMillis: 60000,
              },
            });
          });

          it("Logs MOBILE_ASYNC_GET_JWKS_SUCCESS with JWKS URI", async () => {
            expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
              messageCode: "MOBILE_ASYNC_GET_JWKS_SUCCESS",
              data: {
                jwksUri: "mock_jwks_uri",
              },
            });
          });
        });

        describe("Given age header is not a number", () => {
          beforeEach(async () => {
            result = await getJwksFromJwksUri(
              "mock_jwks_uri",
              jest
                .fn<
                  ReturnType<ISendHttpRequest>,
                  Parameters<ISendHttpRequest>
                >()
                .mockResolvedValue(
                  successResult({
                    statusCode: 200,
                    body: JSON.stringify({
                      keys: [{ key1: "value1" }, { key2: "value2" }],
                    }),
                    headers: {
                      Age: "a",
                      "Cache-Control": "max-age=60",
                    },
                  }),
                ),
            );
          });

          it("Returns success with array of keys and cache duration with value from max-age header", async () => {
            expect(result).toEqual({
              isError: false,
              value: {
                keys: [{ key1: "value1" }, { key2: "value2" }],
                cacheDurationMillis: 60000,
              },
            });
          });

          it("Logs MOBILE_ASYNC_GET_JWKS_SUCCESS with JWKS URI", async () => {
            expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
              messageCode: "MOBILE_ASYNC_GET_JWKS_SUCCESS",
              data: {
                jwksUri: "mock_jwks_uri",
              },
            });
          });
        });

        describe("Given age header is not an integer", () => {
          beforeEach(async () => {
            result = await getJwksFromJwksUri(
              "mock_jwks_uri",
              jest
                .fn<
                  ReturnType<ISendHttpRequest>,
                  Parameters<ISendHttpRequest>
                >()
                .mockResolvedValue(
                  successResult({
                    statusCode: 200,
                    body: JSON.stringify({
                      keys: [{ key1: "value1" }, { key2: "value2" }],
                    }),
                    headers: {
                      Age: "3.14",
                      "Cache-Control": "max-age=60",
                    },
                  }),
                ),
            );
          });

          it("Returns success with array of keys and cache duration with value from max-age header", async () => {
            expect(result).toEqual({
              isError: false,
              value: {
                keys: [{ key1: "value1" }, { key2: "value2" }],
                cacheDurationMillis: 60000,
              },
            });
          });

          it("Logs MOBILE_ASYNC_GET_JWKS_SUCCESS with JWKS URI", async () => {
            expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
              messageCode: "MOBILE_ASYNC_GET_JWKS_SUCCESS",
              data: {
                jwksUri: "mock_jwks_uri",
              },
            });
          });
        });
      });
    });

    describe("Given max-age is not returned in Cache-Control header", () => {
      beforeEach(async () => {
        sendRequest = jest.fn().mockResolvedValue(
          successResult({
            statusCode: 200,
            body: JSON.stringify({
              keys: [{ key1: "value1" }, { key2: "value2" }],
            }),
            headers: {},
          }),
        );
        result = await getJwksFromJwksUri("mock_jwks_uri", sendRequest);
      });

      it("Returns success with array of keys and cache duration of 0", async () => {
        expect(result).toEqual({
          isError: false,
          value: {
            keys: [{ key1: "value1" }, { key2: "value2" }],
            cacheDurationMillis: 0,
          },
        });
      });

      it("Logs MOBILE_ASYNC_GET_JWKS_SUCCESS with JWKS URI", async () => {
        expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_GET_JWKS_SUCCESS",
          data: {
            jwksUri: "mock_jwks_uri",
          },
        });
      });
    });
  });
});
