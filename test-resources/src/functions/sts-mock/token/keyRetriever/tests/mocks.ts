import {
  successResult,
  Result,
  errorResult,
  ErrorCategory,
} from "../../../../common/utils/result";
import { IKeyRetriever, SigningKey } from "../keyRetriever";
import { getMockSigningKey } from "../../../../testUtils/getMockSigningKey";

export class MockKeyRetrieverSuccessResult implements IKeyRetriever {
  async getKey(): Promise<Result<SigningKey>> {
    return Promise.resolve(successResult(getMockSigningKey()));
  }
}

export class MockKeyRetrieverErrorResult implements IKeyRetriever {
  async getKey(): Promise<Result<SigningKey>> {
    return Promise.resolve(
      errorResult({
        errorMessage: "Some S3 error",
        errorCategory: ErrorCategory.SERVER_ERROR,
      }),
    );
  }
}
