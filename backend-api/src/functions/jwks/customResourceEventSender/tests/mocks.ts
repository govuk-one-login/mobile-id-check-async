import { ICustomResourceEventSender } from "../customResourceEventSender";
import {
  ErrorCategory,
  errorResult,
  Result,
  successResult,
} from "../../../utils/result";

export class MockCustomResourceEventSenderSuccessResult
  implements ICustomResourceEventSender
{
  private result: { result: string }[] = [];
  async sendEvent(result: string): Promise<Result<null>> {
    this.result.push({ result: result });
    return Promise.resolve(successResult(null));
  }
  getResult = (): { result: string }[] => {
    return this.result;
  };
}

export class MockCustomResourceEventSenderErrorResult
  implements ICustomResourceEventSender
{
  async sendEvent(): Promise<Result<null>> {
    return Promise.resolve(
      errorResult({
        errorMessage: "Error sending Custom Resource event",
        errorCategory: ErrorCategory.SERVER_ERROR,
      }),
    );
  }
}
