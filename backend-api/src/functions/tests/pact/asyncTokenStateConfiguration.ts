import { registeredLogs } from "../../asyncToken/registeredLogs";
import { MockEventWriterSuccess } from "../../services/events/tests/mocks";
import { MockLoggingAdapter } from "../../services/logging/tests/mockLogger";
import { Logger } from "../../services/logging/logger";
import { IGetRegisteredIssuerUsingClientSecrets } from "../../services/clientRegistryService/clientRegistryService";
import {
  MockClientRegistryServiceSuccessResult,
  MockTokenServiceSuccessResult,
} from "../../testUtils/asyncTokenMocks";
import { IAsyncTokenRequestDependencies } from "../../asyncToken/handlerDependencies";

export class StateConfiguration {
  secret: string = "";
  asyncTokenDependencies: IAsyncTokenRequestDependencies = {
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

  get asyncTokenDependenciesValue() {
    return this.asyncTokenDependencies;
  }

  set asyncTokenDependenciesValue(value: IAsyncTokenRequestDependencies) {
    this.asyncTokenDependencies = value;
  }

  set asyncTokenDependenciesClientRegistryService(
    value: () => IGetRegisteredIssuerUsingClientSecrets,
  ) {
    this.asyncTokenDependencies.clientRegistryService = value;
  }

  resetToPassingAsyncTokenDependencies() {
    this.asyncTokenDependencies = {
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
}

export const stateConfig = new StateConfiguration();
