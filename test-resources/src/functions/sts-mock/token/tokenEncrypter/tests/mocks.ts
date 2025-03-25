import { ITokenEncrypter, JWE } from "../tokenEncrypter";
import {
  ErrorCategory,
  errorResult,
  Result,
  successResult,
} from "../../../../common/utils/result";

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
      errorCategory: ErrorCategory.SERVER_ERROR,
    });
  }
}
