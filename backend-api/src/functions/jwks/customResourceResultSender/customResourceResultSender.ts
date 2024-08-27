import { CloudFormationCustomResourceEvent, Context } from "aws-lambda";
import { Result, successResult } from "../../utils/result";

export class CustomResourceResultSender implements ICustomResourceResultSender {
  private readonly event: CloudFormationCustomResourceEvent;
  private readonly context: Context;

  constructor(event: CloudFormationCustomResourceEvent, context: Context) {
    this.event = event;
    this.context = context;
  }

  async sendResult(status: "SUCCESS" | "FAILED") {
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

    const params: RequestInit = {
      method: "PUT",
      body: JSON.stringify(customResourceResponseBody),
    };

    await fetch(this.event.ResponseURL, params);
    return successResult("");
  }
}

export interface ICustomResourceResultSender {
  sendResult: (status: "SUCCESS" | "FAILED") => Promise<Result<string>>;
}
