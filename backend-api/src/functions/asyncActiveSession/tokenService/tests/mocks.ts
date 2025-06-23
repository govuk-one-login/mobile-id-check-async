import {
  ErrorCategory,
  errorResult,
  Result,
  successResult,
} from "../../../utils/result";

import { ITokenService } from "../types";

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
