import { ITokenEncrypter, JWE } from "../tokenEncrypter";
import {
  errorResult,
  Result,
  successResult,
} from "../../../../../utils/result";

export class MockTokenEncrypterSuccessResult implements ITokenEncrypter {
  async encrypt(): Promise<Result<JWE>> {
    return Promise.resolve(
      successResult("header.encrypted_key.iv.ciphertext.tag" as JWE),
    );
  }
}

export class MockTokenEncrypterErrorResult implements ITokenEncrypter {
  async encrypt(): Promise<Result<JWE>> {
    return errorResult({
      errorMessage: "Some error encrypting token",
      errorCategory: "SERVER_ERROR",
    });
  }
}
