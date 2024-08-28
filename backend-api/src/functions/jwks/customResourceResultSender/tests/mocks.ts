import { ICustomResourceResultSender } from "../customResourceResultSender";

export class MockCustomResourceResultSenderSuccessResult
  implements ICustomResourceResultSender
{
  private result: { result: string }[] = [];
  async sendResult(result: string): Promise<void> {
    this.result.push({ result: result });
    return;
  }
  getResult = (): { result: string }[] => {
    return this.result;
  };
}
