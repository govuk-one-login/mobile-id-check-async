import { MockTokenServiceSuccessResult } from "../../../asyncToken/tokenService/tests/mocks";
import {
  MockClientRegistryServiceSuccessResult,
  MockClientRegistryServiceBadRequestResult,
} from "../../../services/clientRegistryService/tests/mocks";
import { MockRequestServiceSuccessResult } from "../../../asyncToken/requestService/tests/mocks";
import { IAsyncTokenRequestDependencies } from "../../../asyncToken/handlerDependencies";
import { mockSendMessageToSqsSuccess } from "../../../testUtils/unitTestData";

const defaultPassingDependencies: IAsyncTokenRequestDependencies = {
  env: {
    SIGNING_KEY_ID: "mockSigningKeyId",
    ISSUER: "mockIssuer",
    TXMA_SQS: "mockSQSQueue",
    CLIENT_REGISTRY_SECRET_NAME: "mockRegistryParameterName",
  },
  clientRegistryService: () => new MockClientRegistryServiceSuccessResult(),
  tokenService: () => new MockTokenServiceSuccessResult(),
  requestService: () => new MockRequestServiceSuccessResult(),
  sendMessageToSqs: mockSendMessageToSqsSuccess,
};

export class AsyncTokenDependencies {
  dependencies = defaultPassingDependencies;

  setInvalidAuthHeader = () => {
    this.dependencies = {
      ...defaultPassingDependencies,
      clientRegistryService: () =>
        new MockClientRegistryServiceBadRequestResult(),
    };
  };

  setValidAuthHeader = () => {
    this.dependencies = defaultPassingDependencies;
  };
}

export const asyncTokenDependencies = new AsyncTokenDependencies();
