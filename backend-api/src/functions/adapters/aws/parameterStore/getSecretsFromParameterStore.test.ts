import "../../../../../tests/testUtils/matchers";
import "dotenv/config";
import { mockClient } from "aws-sdk-client-mock";
import "aws-sdk-client-mock-vitest";
import {
  GetParametersCommand,
  InternalServerError,
  SSMClient,
} from "@aws-sdk/client-ssm";
import { emptyFailure, Result, successResult } from "../../../utils/result";
import { getSecretsFromParameterStore } from "./getSecretsFromParameterStore";
import { clearCaches } from "@aws-lambda-powertools/parameters";
import { NOW_IN_MILLISECONDS } from "../../../testUtils/unitTestData";
import {
  vi,
  expect,
  it,
  describe,
  beforeEach,
  afterEach,
  type MockInstance,
} from "vitest";

const mockSsmClient = mockClient(SSMClient);
const mockSecretName1 = "mockSecretName1";
const mockSecretName2 = "mockSecretName2";
const mockSecretValue1 = "mockSecretValue1";
const mockSecretValue2 = "mockSecretValue2";

let result: Result<Record<string, string>, void>;
let consoleDebugSpy: MockInstance;
let consoleErrorSpy: MockInstance;

describe("getSecretsFromParameterStore", () => {
  beforeEach(() => {
    consoleDebugSpy = vi.spyOn(console, "debug");
    consoleErrorSpy = vi.spyOn(console, "error");
    vi.useFakeTimers();
    vi.setSystemTime(NOW_IN_MILLISECONDS);
  });
  afterEach(() => {
    mockSsmClient.reset();
    clearCaches();
    vi.useRealTimers();
  });

  describe("On every call", () => {
    beforeEach(async () => {
      mockSsmClient.onAnyCommand().rejects();
      result = await getSecretsFromParameterStore({
        secretNames: [mockSecretName1, mockSecretName2],
      });
    });
    it("Logs attempt at debug level", () => {
      expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_GET_SECRETS_FROM_PARAMETER_STORE_ATTEMPT",
        data: {
          secretNames: [mockSecretName1, mockSecretName2],
        },
      });
    });
  });

  describe("When a server error occurs retrieving secrets", () => {
    beforeEach(async () => {
      mockSsmClient
        .onAnyCommand()
        .rejects(
          new InternalServerError({ $metadata: {}, message: "server error" }),
        );
      result = await getSecretsFromParameterStore({
        secretNames: [mockSecretName1],
      });
    });

    it("Logs error", () => {
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_GET_SECRETS_FROM_PARAMETER_STORE_FAILURE",
      });
    });

    it("Returns failure", () => {
      expect(result).toEqual(emptyFailure());
    });
  });

  describe("When any secret cannot be found", () => {
    beforeEach(async () => {
      mockSsmClient.onAnyCommand().resolves({
        Parameters: [
          {
            Name: mockSecretName1,
            Value: mockSecretValue1,
          },
        ],
        InvalidParameters: [mockSecretName2],
      });
      result = await getSecretsFromParameterStore({
        secretNames: [mockSecretName1, mockSecretName2],
      });
    });

    it("Logs error", () => {
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_GET_SECRETS_FROM_PARAMETER_STORE_FAILURE",
      });
    });

    it("Returns failure", () => {
      expect(result).toEqual(emptyFailure());
    });
  });

  describe("When any passed secret name is missing from parameter store response", () => {
    beforeEach(async () => {
      mockSsmClient.onAnyCommand().resolves({
        Parameters: [
          {
            Name: mockSecretName1,
            Value: mockSecretValue1,
          },
        ],
      });
      result = await getSecretsFromParameterStore({
        secretNames: [mockSecretName1, mockSecretName2],
      });
    });

    it("Logs error", () => {
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_GET_SECRETS_FROM_PARAMETER_STORE_FAILURE",
      });
    });

    it("Returns failure", () => {
      expect(result).toEqual(emptyFailure());
    });
  });

  describe("When passed empty array of secret names", () => {
    beforeEach(async () => {
      result = await getSecretsFromParameterStore({ secretNames: [] });
    });

    it("Logs success at debug level", () => {
      expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_GET_SECRETS_FROM_PARAMETER_STORE_SUCCESS",
      });
    });

    it("Returns success with empty array", () => {
      expect(result).toEqual(successResult({}));
    });
  });

  describe("Happy paths", () => {
    beforeEach(() => {
      mockSsmClient.onAnyCommand().rejects(); // ensures tests fail if SSM called with unexpected input
    });

    describe("When passed a single valid secret name", () => {
      beforeEach(async () => {
        mockSsmClient
          .on(GetParametersCommand, {
            Names: [mockSecretName1],
            WithDecryption: true,
          })
          .resolves({
            Parameters: [
              {
                Name: mockSecretName1,
                Value: mockSecretValue1,
              },
            ],
          });
        result = await getSecretsFromParameterStore({
          secretNames: [mockSecretName1],
        });
      });

      it("Logs success at debug level", () => {
        expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_GET_SECRETS_FROM_PARAMETER_STORE_SUCCESS",
        });
      });

      it("Returns success with value of secret", () => {
        expect(result).toEqual(
          successResult({
            [mockSecretName1]: mockSecretValue1,
          }),
        );
      });
    });

    describe("When passed multiple valid secret names", () => {
      beforeEach(async () => {
        mockSsmClient
          .on(GetParametersCommand, {
            Names: [mockSecretName1, mockSecretName2],
            WithDecryption: true,
          })
          .resolves({
            Parameters: [
              {
                Name: mockSecretName1,
                Value: mockSecretValue1,
              },
              {
                Name: mockSecretName2,
                Value: mockSecretValue2,
              },
            ],
          });
        result = await getSecretsFromParameterStore({
          secretNames: [mockSecretName1, mockSecretName2],
        });
      });

      it("Logs success at debug level", () => {
        expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_GET_SECRETS_FROM_PARAMETER_STORE_SUCCESS",
        });
      });

      it("Returns success with values of secrets in same order", () => {
        expect(result).toEqual(
          successResult({
            [mockSecretName1]: mockSecretValue1,
            [mockSecretName2]: mockSecretValue2,
          }),
        );
      });
    });
  });

  describe("When called twice for same secret names within cache duration", () => {
    beforeEach(async () => {
      mockSsmClient
        .on(GetParametersCommand, {
          Names: [mockSecretName1, mockSecretName2],
          WithDecryption: true,
        })
        .resolves({
          Parameters: [
            {
              Name: mockSecretName1,
              Value: mockSecretValue1,
            },
            {
              Name: mockSecretName2,
              Value: mockSecretValue2,
            },
          ],
        });

      await getSecretsFromParameterStore({
        secretNames: [mockSecretName1, mockSecretName2],
        cacheDurationInSeconds: 10,
      });

      vi.setSystemTime(NOW_IN_MILLISECONDS + 10000);

      result = await getSecretsFromParameterStore({
        secretNames: [mockSecretName1, mockSecretName2],
        cacheDurationInSeconds: 10,
      });
    });

    it("Logs success at debug level", () => {
      expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_GET_SECRETS_FROM_PARAMETER_STORE_SUCCESS",
      });
    });

    it("Returns success with values of secrets", () => {
      expect(result).toEqual(
        successResult({
          [mockSecretName1]: mockSecretValue1,
          [mockSecretName2]: mockSecretValue2,
        }),
      );
    });

    it("Makes only one call to SSM", () => {
      expect(mockSsmClient).toHaveReceivedCommandTimes(GetParametersCommand, 1);
    });
  });
  describe("When called twice for same secret names beyond cache duration", () => {
    beforeEach(async () => {
      mockSsmClient
        .on(GetParametersCommand, {
          Names: [mockSecretName1, mockSecretName2],
          WithDecryption: true,
        })
        .resolves({
          Parameters: [
            {
              Name: mockSecretName1,
              Value: mockSecretValue1,
            },
            {
              Name: mockSecretName2,
              Value: mockSecretValue2,
            },
          ],
        });

      await getSecretsFromParameterStore({
        secretNames: [mockSecretName1, mockSecretName2],
        cacheDurationInSeconds: 10,
      });

      vi.setSystemTime(NOW_IN_MILLISECONDS + 10001);

      result = await getSecretsFromParameterStore({
        secretNames: [mockSecretName1, mockSecretName2],
        cacheDurationInSeconds: 10,
      });
    });

    it("Logs success at debug level", () => {
      expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_GET_SECRETS_FROM_PARAMETER_STORE_SUCCESS",
      });
    });

    it("Returns success with values of secrets", () => {
      expect(result).toEqual(
        successResult({
          [mockSecretName1]: mockSecretValue1,
          [mockSecretName2]: mockSecretValue2,
        }),
      );
    });

    it("Makes two calls to SSM", () => {
      expect(mockSsmClient).toHaveReceivedCommandTimes(GetParametersCommand, 2);
    });
  });
});
