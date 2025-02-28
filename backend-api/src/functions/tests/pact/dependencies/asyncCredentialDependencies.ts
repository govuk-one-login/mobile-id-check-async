import {
  MockTokenServiceGetDecodedTokenErrorResult,
  MockTokenServiceSuccessIPV,
} from "../../../asyncCredential/tokenService/tests/mocks";
import { MockClientRegistryServiceGetPartialClientSuccessResultIPV } from "../../../services/clientRegistryService/tests/mocks";
import { MockEventWriterSuccess } from "../../../services/events/tests/mocks";
import { MockSessionServiceCreateSuccessResult } from "../../../services/session/tests/mocks";

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
  clientRegistryService: () =>
    new MockClientRegistryServiceGetPartialClientSuccessResultIPV(),
  tokenService: () => new MockTokenServiceSuccessIPV(),
  sessionService: () => new MockSessionServiceCreateSuccessResult(),
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
