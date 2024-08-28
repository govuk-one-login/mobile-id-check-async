import { successResult, Result, errorResult } from "../../../utils/result";
import { IJwksUploader } from "../jwksUploader";

export class MockJwksUploaderSuccessResult implements IJwksUploader {
  async uploadJwks(): Promise<Result<string>> {
    return successResult("");
  }
}

export class MockJwksUploaderErrorResult implements IJwksUploader {
  async uploadJwks(): Promise<Result<string>> {
    return errorResult({
      errorMessage: "Error uploading file to S3",
      errorCategory: "SERVER_ERROR",
    });
  }
}
