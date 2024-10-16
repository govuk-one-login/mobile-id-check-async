import { errorResult, Result, successResult } from "../../../utils/result";
import { IPublicKeyGetter } from "../publicKeyGetter";
import { ITokenService } from "../tokenService";
import { ITokenVerifier } from "../tokenVerifier";

// export class MockPubicKeyGetterGetPublicKeyError implements IPublicKeyGetter {
//   getPublicKey() {
//     return Promise.resolve(
//       errorResult({
//         errorMessage: "Failed to get public key",
//         errorCategory: "SERVER_ERROR",
//       }),
//     );
//   }
// }
//
// export class MockPubicKeyGetterGetPublicKeySuccess implements IPublicKeyGetter {
//   getPublicKey() {
//     return Promise.resolve(successResult(new Uint8Array()));
//   }
// }

export class MockTokenServiceServerError implements ITokenService {
  async validateServiceToken(): Promise<Result<string>> {
    return errorResult({
      errorMessage: "Mock server error",
      errorCategory: "SERVER_ERROR",
    });
  }
}

export class MockTokenServiceClientError implements ITokenService {
  async validateServiceToken(): Promise<Result<string>> {
    return errorResult({
      errorMessage: "Mock client error",
      errorCategory: "CLIENT_ERROR",
    });
  }
}

export class MockTokenServiceSuccess implements ITokenService {
  async validateServiceToken(): Promise<Result<string>> {
    return successResult("mockSub");
  }
}

export class MockTokenVerifierError implements ITokenVerifier {
  async verify(): Promise<Result<null>> {
    return errorResult({
      errorMessage: "Mock signature verification error",
      errorCategory: "CLIENT_ERROR",
    });
  }
}

export class MockTokenVerifierSuccess implements ITokenVerifier {
  async verify(): Promise<Result<null>> {
    return successResult(null);
  }
}
