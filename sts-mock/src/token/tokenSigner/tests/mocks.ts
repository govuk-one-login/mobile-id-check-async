import { successResult, Result, errorResult } from "../../../utils/result";
import { ITokenSigner } from "../tokenSigner";

export class MockTokenSignerSuccessResult implements ITokenSigner {
  async sign(): Promise<Result<string>> {
    return Promise.resolve(successResult("mockServiceToken"));
  }
}

export class MockTokenSignerErrorResult implements ITokenSigner {
  async sign(): Promise<Result<string>> {
    return Promise.resolve(
      errorResult({
        errorMessage: "Some signing error",
        errorCategory: "SERVER_ERROR",
      }),
    );
  }
}
