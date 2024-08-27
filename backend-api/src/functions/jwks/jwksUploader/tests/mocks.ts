import { successResult, Result } from "../../../utils/result";
import { IJwksUploader } from "../jwksUploader";

export class MockJwksUploaderSuccessResult implements IJwksUploader {
  async uploadJwks(): Promise<Result<string>> {
    return successResult("");
  }
}
