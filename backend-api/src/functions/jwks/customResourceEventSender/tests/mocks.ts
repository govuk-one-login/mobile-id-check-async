import { ICustomResourceEventSender } from "../customResourceEventSender";
import { Result, successResult } from "../../../utils/result";

export class MockCustomResourceEventSenderSuccessResult
  implements ICustomResourceEventSender
{
  private result: { result: string }[] = [];
  async sendEvent(result: string): Promise<Result<string>> {
    this.result.push({ result: result });
    return successResult("");
  }
  getResult = (): { result: string }[] => {
    return this.result;
  };
}
