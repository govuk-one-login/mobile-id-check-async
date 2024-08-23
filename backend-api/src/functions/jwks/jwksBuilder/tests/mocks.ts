import { successResult, Result } from "../../../utils/result";
import {IJwksBuilder} from "../jwksBuilder";

export class MockJwksBuilderSuccessResult implements IJwksBuilder {
  async buildJwks(): Promise<Result<string>> {
    return successResult("");
  }
}