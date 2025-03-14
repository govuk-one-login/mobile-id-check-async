import { MockEventWriterSuccess } from "../../../services/events/tests/mocks";
import { MockTokenServiceSuccessResult } from "../../../asyncToken/tokenService/tests/mocks";
import {
  MockClientRegistryServiceSuccessResult,
  MockClientRegistryServiceBadRequestResult,
} from "../../../services/clientRegistryService/tests/mocks";
import { MockRequestServiceSuccessResult } from "../../../asyncToken/requestService/tests/mocks";

const defaultPassingDependencies = {
  env: {
    SIGNING_KEY_ID: "mockSigningKeyId",
    ISSUER: "mockIssuer",
    TXMA_SQS: "mockSQSQueue",
    CLIENT_REGISTRY_SECRET_NAME: "mockRegistryParameterName",
  },
  eventService: () => new MockEventWriterSuccess(),
  clientRegistryService: () => new MockClientRegistryServiceSuccessResult(),
  tokenService: () => new MockTokenServiceSuccessResult(),
  requestService: () => new MockRequestServiceSuccessResult(),
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
