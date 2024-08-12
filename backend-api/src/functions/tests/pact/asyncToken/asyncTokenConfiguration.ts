import { registeredLogs } from "../../../asyncToken/registeredLogs";
import { MockEventWriterSuccess } from "../../../services/events/tests/mocks";
import { MockLoggingAdapter } from "../../../services/logging/tests/mockLogger";
import { Logger } from "../../../services/logging/logger";
import {
  MockClientRegistryServiceBadRequestResult,
  MockClientRegistryServiceSuccessResult,
  MockTokenServiceSuccessResult,
} from "../../../testUtils/asyncTokenMocks";
import { IAsyncTokenRequestDependencies } from "../../../asyncToken/handlerDependencies";

export class AsyncTokenConfiguration {
  secret: string = "";
  dependencies: IAsyncTokenRequestDependencies;

  constructor() {
    this.dependencies = this.getPassingDependencies();
  }

  setDependenciesByScenario(scenario?: AsyncTokenTestScenario) {
    if (scenario === "badDummySecret is not a valid basic auth secret") {
      this.resetToPassingDependencies();
      this.dependencies.clientRegistryService = () =>
        new MockClientRegistryServiceBadRequestResult();
    }

    if (scenario === "dummySecret is a valid basic auth secret") {
      this.resetToPassingDependencies();
    }
  }

  private getPassingDependencies() {
    return {
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
  }

  private resetToPassingDependencies() {
    this.dependencies = this.getPassingDependencies();
  }
}

type AsyncTokenTestScenario =
  | "badDummySecret is not a valid basic auth secret"
  | "dummySecret is a valid basic auth secret";

export const asyncTokenConfig = new AsyncTokenConfiguration();
