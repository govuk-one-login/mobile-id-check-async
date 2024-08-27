import { successResult, Result } from "../../../utils/result";
import { ICustomResourceResultSender } from "../customResourceResultSender";

export class MockCustomResourceResultSenderSuccessResult
  implements ICustomResourceResultSender
{
  async sendResult(): Promise<Result<string>> {
    return successResult("");
  }
}
