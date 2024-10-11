import { errorResult, successResult } from "../../../utils/result";
import { IPublicKeyGetter } from "../publicKeyGetter";

export class MockPubicKeyGetterGetPublicKeyError implements IPublicKeyGetter {
  getPublicKey() {
    return Promise.resolve(
      errorResult({
        errorMessage: "Failed to get public key",
        errorCategory: "CLIENT_ERROR", // CLIENT or SERVER error?
      }),
    );
  }
}

export class MockPubicKeyGetterGetPublicKeySuccess implements IPublicKeyGetter {
  getPublicKey() {
    return Promise.resolve(successResult(new Uint8Array()));
  }
}