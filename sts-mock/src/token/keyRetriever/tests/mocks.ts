import { successResult, Result, errorResult } from "../../../utils/result";
import { IKeyRetriever, SigningKey } from "../keyRetriever";
import { getMockSigningKey } from "../../../testUtils/getMockSigningKey";

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
        errorCategory: "SERVER_ERROR",
      }),
    );
  }
}
