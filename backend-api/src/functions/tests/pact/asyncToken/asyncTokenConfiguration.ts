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
  dependencies: IAsyncTokenRequestDependencies = this.getPassingDependencies();

  setDependencies(scenario?: AsyncTokenTestScenarios) {
    this.resetToPassingDependencies();

    if (scenario === "INVALID_CLIENT_SECRETS")
      this.dependencies.clientRegistryService = () =>
        new MockClientRegistryServiceBadRequestResult();
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

type AsyncTokenTestScenarios = "INVALID_CLIENT_SECRETS";

export const asyncTokenConfig = new AsyncTokenConfiguration();
