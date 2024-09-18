import { successResult, Result, errorResult } from "../../../utils/result";
import { IServiceTokenGenerator } from "../serviceTokenGenerator";

export class MockServiceTokenGeneratorSuccessResult
  implements IServiceTokenGenerator
{
  async generateServiceToken(): Promise<Result<string>> {
    return Promise.resolve(successResult("mockServiceToken"));
  }
}

export class MockServiceTokenGeneratorErrorResult
    implements IServiceTokenGenerator
{
  async generateServiceToken(): Promise<Result<string>> {
    return Promise.resolve(errorResult({
      errorMessage: "Some S3 error",
      errorCategory: "SERVER_ERROR",
    }));
  }
}