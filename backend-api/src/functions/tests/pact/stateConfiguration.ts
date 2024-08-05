import { IAsyncTokenRequestDependencies } from "../../asyncToken/asyncTokenHandler";
import { registeredLogs } from "../../asyncToken/registeredLogs";
import { MockEventWriterSuccess } from "../../services/events/tests/mocks";
import { MockLoggingAdapter } from "../../services/logging/tests/mockLogger";
import { Logger } from "../../services/logging/logger";
import {
  MockClientRegistryServiceSuccessResult,
  MockRequestServiceSuccessResult,
  MockTokenServiceSuccessResult,
} from "../../asyncToken/asyncTokenHandler.test";
import { IGetRegisteredIssuerUsingClientSecrets } from "../../services/clientRegistryService/clientRegistryService";

export class StateConfiguration {
  env = {
    SIGNING_KEY_ID: "mockSigningKeyId",
    ISSUER: "mockIssuer",
    SQS_QUEUE: "mockSQSQueue",
    CLIENT_REGISTRY_PARAMETER_NAME: "mockRegistryParameterName",
  };

  secret: string = "";
  componentId: string = "";
  asyncTokenDependencies: IAsyncTokenRequestDependencies = {
    env: this.env,
    eventService: () => new MockEventWriterSuccess(),
    logger: () => new Logger(new MockLoggingAdapter(), registeredLogs),
    requestService: () => new MockRequestServiceSuccessResult(),
    clientRegistryService: () => new MockClientRegistryServiceSuccessResult(),
    tokenService: () => new MockTokenServiceSuccessResult(),
  };

  get secretValue(): string {
    return this.secret;
  }

  set secretValue(value: string) {
    this.secret = value;
  }

  get asyncTokenDependenciesValue() {
    return this.asyncTokenDependencies;
  }

  set asyncTokenDependenciesValue(value: IAsyncTokenRequestDependencies) {
    this.asyncTokenDependencies = value;
  }

  set asyncTokenDependenciesClientRegisteryService(
    value: () => IGetRegisteredIssuerUsingClientSecrets,
  ) {
    this.asyncTokenDependencies.clientRegistryService = value;
  }

  resetToPassingAsyncTokenDependencies() {
    this.asyncTokenDependencies = {
      env: this.env,
      eventService: () => new MockEventWriterSuccess(),
      logger: () => new Logger(new MockLoggingAdapter(), registeredLogs),
      requestService: () => new MockRequestServiceSuccessResult(),
      clientRegistryService: () => new MockClientRegistryServiceSuccessResult(),
      tokenService: () => new MockTokenServiceSuccessResult(),
    };
  }
}

export const stateConfig = new StateConfiguration();
