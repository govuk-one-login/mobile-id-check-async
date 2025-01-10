import {
  successResult,
  errorResult,
  Result,
  ErrorCategory,
} from "../../../utils/result";
import { IMintToken } from "../tokenService";

export class MockTokenServiceSuccessResult implements IMintToken {
  async mintToken(): Promise<Result<string>> {
    return successResult("mockToken");
  }
}

export class MockTokenServiceErrorResult implements IMintToken {
  async mintToken(): Promise<Result<string>> {
    return errorResult({
      errorMessage: "Failed to sign Jwt",
      errorCategory: ErrorCategory.SERVER_ERROR,
    });
  }
}
