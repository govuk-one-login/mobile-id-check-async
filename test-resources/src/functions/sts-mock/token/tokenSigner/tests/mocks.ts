import {
  successResult,
  Result,
  errorResult,
  ErrorCategory,
} from "../../../../common/utils/result";
import { ITokenSigner, JWT } from "../tokenSigner";

export class MockTokenSignerSuccessResult implements ITokenSigner {
  async sign(): Promise<Result<JWT>> {
    return Promise.resolve(successResult("header.payload.signature" as JWT));
  }
}

export class MockTokenSignerErrorResult implements ITokenSigner {
  async sign(): Promise<Result<JWT>> {
    return Promise.resolve(
      errorResult({
        errorMessage: "Some signing error",
        errorCategory: ErrorCategory.SERVER_ERROR,
      }),
    );
  }
}
