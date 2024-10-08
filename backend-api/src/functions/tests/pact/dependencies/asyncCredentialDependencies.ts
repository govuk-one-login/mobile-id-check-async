import { registeredLogs } from "../../../asyncCredential/registeredLogs";
import { MockDynamoDbAdapterCreateSuccessResult } from "../../../adapters/session/tests/mocks";
import {
  MockTokenServiceGetDecodedTokenErrorResult,
  MockTokenServiceSuccessIPV,
} from "../../../asyncCredential/tokenService/tests/mocks";
import { MockClientRegistryServiceGetPartialClientSuccessResultIPV } from "../../../services/clientRegistryService/tests/mocks";
import { MockEventWriterSuccess } from "../../../services/events/tests/mocks";
import { Logger } from "../../../services/logging/logger";
import { MockLoggingAdapter } from "../../../services/logging/tests/mockLogger";

const defaultPassingDependencies = {
  env: {
    SIGNING_KEY_ID: "mockKid",
    ISSUER: "mockIssuer",
    SESSION_TABLE_NAME: "mockTableName",
    SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME: "mockIndexName",
    SESSION_DURATION_IN_SECONDS: "12345",
    TXMA_SQS: "mockSqsQueue",
    CLIENT_REGISTRY_SECRET_NAME: "mockParmaterName",
  },
  eventService: () => new MockEventWriterSuccess(),
  logger: () => new Logger(new MockLoggingAdapter(), registeredLogs),
  clientRegistryService: () =>
    new MockClientRegistryServiceGetPartialClientSuccessResultIPV(),
  tokenService: () => new MockTokenServiceSuccessIPV(),
  datastore: () => new MockDynamoDbAdapterCreateSuccessResult(),
};

export class AsyncCredentialDependencies {
  dependencies = defaultPassingDependencies;

  setValidAccessToken() {
    this.dependencies = defaultPassingDependencies;
  }

  setInvalidAccessToken() {
    this.dependencies = {
      ...defaultPassingDependencies,
      tokenService: () => new MockTokenServiceGetDecodedTokenErrorResult(),
    };
  }

  setMissingAccessToken() {
    this.dependencies = defaultPassingDependencies;
  }
}
export const asyncCredentialDependencies = new AsyncCredentialDependencies();
