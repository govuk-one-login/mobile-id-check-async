import { successResult, Result, errorResult } from "../../../utils/result";
import { IKeyRetriever } from "../keyRetriever";
import { KeyLike } from "jose";

export class MockKeyRetrieverSuccessResult implements IKeyRetriever {
  async getKey(): Promise<Result<KeyLike | Uint8Array>> {
    return Promise.resolve(successResult(new Uint8Array()));
  }
}

export class MockKeyRetrieverErrorResult implements IKeyRetriever {
  async getKey(): Promise<Result<KeyLike | Uint8Array>> {
    return Promise.resolve(
      errorResult({
        errorMessage: "Some S3 error",
        errorCategory: "SERVER_ERROR",
      }),
    );
  }
}
