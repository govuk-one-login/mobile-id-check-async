import { mockClient } from "aws-sdk-client-mock";
import "aws-sdk-client-mock-jest";
import {
  GetParametersCommand,
  InternalServerError,
  SSMClient,
} from "@aws-sdk/client-ssm";
import { errorResult, Result, successResult } from "../utils/result";
import { getSecretsFromParameterStore } from "./getSecretsFromParameterStore";
import { clearCaches } from "@aws-lambda-powertools/parameters";
import { NOW_IN_MILLISECONDS } from "../testUtils/unitTestData";

const mockSsmClient = mockClient(SSMClient);
const mockSecretName1 = "mockSecretName1";
const mockSecretName2 = "mockSecretName2";
const mockSecretValue1 = "mockSecretValue1";
const mockSecretValue2 = "mockSecretValue2";

let result: Result<string[]>;

describe("getSecretsFromParameterStore", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);
  });
  afterEach(() => {
    mockSsmClient.reset();
    clearCaches();
    jest.useRealTimers();
  });

  describe("When a server error occurs retrieving secrets", () => {
    beforeEach(async () => {
      mockSsmClient
        .onAnyCommand()
        .rejects(
          new InternalServerError({ $metadata: {}, message: "server error" }),
        );
      result = await getSecretsFromParameterStore([mockSecretName1]);
    });

    it("Returns failure", () => {
      expect(result).toEqual(errorResult({ errorMessage: "server_error" }));
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
      result = await getSecretsFromParameterStore([mockSecretName1]);
    });

    it("Returns failure", () => {
      expect(result).toEqual(errorResult({ errorMessage: "server_error" }));
    });
  });

  describe("When passed empty array of secret names", () => {
    beforeEach(async () => {
      result = await getSecretsFromParameterStore([]);
    });
    it("Returns success with empty array", () => {
      expect(result).toEqual(successResult([]));
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
        result = await getSecretsFromParameterStore([mockSecretName1]);
      });
      it("Returns success with value of secret", () => {
        expect(result).toEqual(successResult([mockSecretValue1]));
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
        result = await getSecretsFromParameterStore([
          mockSecretName1,
          mockSecretName2,
        ]);
      });
      it("Returns success with values of secrets in same order", () => {
        expect(result).toEqual(
          successResult([mockSecretValue1, mockSecretValue2]),
        );
      });
    });
  });

  describe("When called twice for same path within cache duration", () => {
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

      await getSecretsFromParameterStore(
        [mockSecretName1, mockSecretName2],
        10,
      );

      jest.setSystemTime(NOW_IN_MILLISECONDS + 10000);

      result = await getSecretsFromParameterStore(
        [mockSecretName1, mockSecretName2],
        10,
      );
    });

    it("Returns success with values of secrets", () => {
      expect(result).toEqual(
        successResult([mockSecretValue1, mockSecretValue2]),
      );
    });

    it("Makes only one call to SSM", () => {
      expect(mockSsmClient).toHaveReceivedCommandTimes(GetParametersCommand, 1);
    });
  });
  describe("When called twice for same path beyond cache duration", () => {
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

      await getSecretsFromParameterStore(
        [mockSecretName1, mockSecretName2],
        10,
      );

      jest.setSystemTime(NOW_IN_MILLISECONDS + 10001);

      result = await getSecretsFromParameterStore(
        [mockSecretName1, mockSecretName2],
        10,
      );
    });

    it("Returns success with values of secrets", () => {
      expect(result).toEqual(
        successResult([mockSecretValue1, mockSecretValue2]),
      );
    });

    it("Makes two calls to SSM", () => {
      expect(mockSsmClient).toHaveReceivedCommandTimes(GetParametersCommand, 2);
    });
  });
});
