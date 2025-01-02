import { mockClient } from "aws-sdk-client-mock";
import { InternalServerError, SSMClient } from "@aws-sdk/client-ssm";
import { errorResult, Result, successResult } from "../utils/result";
import { getSecretsFromParameterStore } from "./getSecretsFromParameterStore";
import { clearCaches } from "@aws-lambda-powertools/parameters";

const mockSsmClient = mockClient(SSMClient);
const mockSecretName1 = "mockSecretName1";
const mockSecretName2 = "mockSecretName2";

let result: Result<string[]>;

describe("getSecretsFromParameterStore", () => {
  afterEach(() => {
    mockSsmClient.reset();
    clearCaches();
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
            Value: "mockSecretValue1",
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
});
