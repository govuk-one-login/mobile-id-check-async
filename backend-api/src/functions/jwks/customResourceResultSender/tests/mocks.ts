import { successResult, Result } from "../../../utils/result";
import {ICustomResourceResultSender} from "../customResourceResultSender";

export class MockCustomResourceResultSenderSuccessResult implements ICustomResourceResultSender {
  async placeholderMethod(): Promise<Result<string>> {
    return successResult("");
  }
}