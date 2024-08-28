import { successResult, Result } from "../../../utils/result";
import { ICustomResourceResultSender } from "../customResourceResultSender";

export class MockCustomResourceResultSenderSuccessResult
  implements ICustomResourceResultSender
{
  private result: { result: string }[] = [];
  async sendResult(result: string): Promise<Result<string>> {
    this.result.push({ result: result });
    return successResult("");
  }
  getResult = (): { result: string }[] => {
    return this.result;
  };
}
