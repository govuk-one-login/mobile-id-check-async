import {CloudFormationCustomResourceEvent, Context} from "aws-lambda";
import {Result, successResult} from "../../utils/result";

export class CustomResourceResultSender implements ICustomResourceResultSender{
    private readonly event: CloudFormationCustomResourceEvent;
    private readonly context: Context;

    constructor(event: CloudFormationCustomResourceEvent, context: Context) {
        this.event = event;
        this.context = context;
    }

    async placeholderMethod() {
        return successResult("");
    }
}

export interface ICustomResourceResultSender {
    placeholderMethod: () => Promise<Result<string>>;
}
