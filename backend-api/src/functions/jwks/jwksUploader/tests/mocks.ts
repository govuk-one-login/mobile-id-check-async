import { successResult, Result, errorResult } from "../../../utils/result";
import { IJwksUploader } from "../jwksUploader";

export class MockJwksUploaderSuccessResult implements IJwksUploader {
  async uploadJwks(): Promise<Result<null>> {
    return Promise.resolve(successResult(null));
  }
}

export class MockJwksUploaderErrorResult implements IJwksUploader {
  async uploadJwks(): Promise<Result<null>> {
    return Promise.resolve(
      errorResult({
        errorMessage: "Error uploading file to S3",
        errorCategory: "SERVER_ERROR",
      }),
    );
  }
}
