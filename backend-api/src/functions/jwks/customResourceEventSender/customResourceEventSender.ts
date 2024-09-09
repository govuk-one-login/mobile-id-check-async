import { CloudFormationCustomResourceEvent, Context } from "aws-lambda";
import { errorResult, Result, successResult } from "../../utils/result";

export class CustomResourceEventSender implements ICustomResourceEventSender {
  private readonly event: CloudFormationCustomResourceEvent;
  private readonly context: Context;

  constructor(event: CloudFormationCustomResourceEvent, context: Context) {
    this.event = event;
    this.context = context;
  }

  async sendEvent(status: "SUCCESS" | "FAILED"): Promise<Result<null>> {
    const customResourceResponseBody = {
      Status: status,
      Reason:
        "See the details in CloudWatch Log Stream: " +
        this.context.logStreamName,
      PhysicalResourceId: this.context.logStreamName,
      StackId: this.event.StackId,
      RequestId: this.event.RequestId,
      LogicalResourceId: this.event.LogicalResourceId,
      NoEcho: false,
    };

    const requestInit: RequestInit = {
      method: "PUT",
      body: JSON.stringify(customResourceResponseBody),
    };

    try {
      const response = await fetch(this.event.ResponseURL, requestInit);
      if (!response.ok) {
        return errorResult({
          errorMessage: "Error sending Custom Resource event",
          errorCategory: "SERVER_ERROR",
        });
      } else {
        return successResult(null);
      }
    } catch {
      return errorResult({
        errorMessage: "Unexpected network error sending Custom Resource event",
        errorCategory: "SERVER_ERROR",
      });
    }
  }
}

export interface ICustomResourceEventSender {
  sendEvent: (status: "SUCCESS" | "FAILED") => Promise<Result<null>>;
}
