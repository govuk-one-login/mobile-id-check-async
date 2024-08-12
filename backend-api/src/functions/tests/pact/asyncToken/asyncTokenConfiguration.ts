import { registeredLogs } from "../../../asyncToken/registeredLogs";
import { MockEventWriterSuccess } from "../../../services/events/tests/mocks";
import { MockLoggingAdapter } from "../../../services/logging/tests/mockLogger";
import { Logger } from "../../../services/logging/logger";
import {
  MockClientRegistryServiceBadRequestResult,
  MockClientRegistryServiceSuccessResult,
  MockTokenServiceSuccessResult,
} from "../../../testUtils/asyncTokenMocks";

const defaultPassingDependencies = {
  env: {
    SIGNING_KEY_ID: "mockSigningKeyId",
    ISSUER: "mockIssuer",
    SQS_QUEUE: "mockSQSQueue",
    CLIENT_REGISTRY_PARAMETER_NAME: "mockRegistryParameterName",
  },
  eventService: () => new MockEventWriterSuccess(),
  logger: () => new Logger(new MockLoggingAdapter(), registeredLogs),
  clientRegistryService: () => new MockClientRegistryServiceSuccessResult(),
  tokenService: () => new MockTokenServiceSuccessResult(),
};

export class AsyncTokenConfiguration {
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

export const asyncTokenConfig = new AsyncTokenConfiguration();
