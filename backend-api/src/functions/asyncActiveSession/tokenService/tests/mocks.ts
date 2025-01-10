import {
  ErrorCategory,
  errorResult,
  Result,
  successResult,
} from "../../../utils/result";
import { ITokenService } from "../tokenService";
import { ITokenVerifier } from "../tokenVerifier";
import { IPublicKeyGetter } from "../publicKeyGetter";
import { importJWK, KeyLike } from "jose";

export class MockPubicKeyGetterError implements IPublicKeyGetter {
  getPublicKey() {
    return Promise.resolve(
      errorResult({
        errorMessage: "Failed to get public key",
        errorCategory: ErrorCategory.SERVER_ERROR,
      }),
    );
  }
}

export class MockPubicKeyGetterWrongPublicKey implements IPublicKeyGetter {
  async getPublicKey(): Promise<Result<KeyLike | Uint8Array>> {
    const wrongPublicKey = await importJWK({
      alg: "ES256",
      crv: "P-256",
      kid: "mockKid",
      kty: "EC",
      use: "sig",
      x: "NYmnFqCEFMVXQsmnSngTkiJK-Q9ixSBxLAXx6ZsBGlc",
      y: "9fpDnWl3rBP-T6z6e60Bmgym3ymjRK_VSdJ7wU_Nwvg",
    });
    return Promise.resolve(successResult(wrongPublicKey));
  }
}

export class MockPubicKeyGetterSuccess implements IPublicKeyGetter {
  async getPublicKey(): Promise<Result<KeyLike | Uint8Array>> {
    const publicKey = await importJWK({
      alg: "ES256",
      crv: "P-256",
      kid: "sThKMT3oxcTXG-sgMw2EVPTE9Y8W43wLXfqu7zT46-w",
      kty: "EC",
      use: "sig",
      x: "YMoiJArVzO9RIVR7J9mUlGixqWyXCAYrZLtdc8EhuO8",
      y: "47JYyUr0qlg3VksGlHCAdpwR_w1dixXfcTi7hBEfrRo",
    });
    return successResult(publicKey);
  }
}

export class MockTokenServiceServerError implements ITokenService {
  async validateServiceToken(): Promise<Result<string>> {
    return errorResult({
      errorMessage: "Mock server error",
      errorCategory: ErrorCategory.SERVER_ERROR,
    });
  }
}

export class MockTokenServiceClientError implements ITokenService {
  async validateServiceToken(): Promise<Result<string>> {
    return errorResult({
      errorMessage: "Mock client error",
      errorCategory: ErrorCategory.CLIENT_ERROR,
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
      errorCategory: ErrorCategory.CLIENT_ERROR,
    });
  }
}

export class MockTokenVerifierSuccess implements ITokenVerifier {
  async verify(): Promise<Result<null>> {
    return successResult(null);
  }
}
