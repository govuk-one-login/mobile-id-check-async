import { mockClient } from "aws-sdk-client-mock";
import { InternalServerError, SSMClient } from "@aws-sdk/client-ssm";
import { errorResult, Result } from "../utils/result";
import { getSecretsFromParameterStore } from "./getSecretsFromParameterStore";

const mockSsmClient = mockClient(SSMClient);
const mockSecretName1 = "mockSecretName1";
const mockSecretName2 = "mockSecretName2";

let result: Result<string[]>;

describe("getSecretsFromParameterStore", () => {
  afterEach(() => {
    mockSsmClient.reset();
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
});
