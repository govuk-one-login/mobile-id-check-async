interface StackName {
  stackName: string;
}

interface SuccessResult extends StackName {
  status: "SUCCESS";
}

export interface FailureResult extends StackName {
  status: "FAILURE";
  reason: string;
}

export type Results = (SuccessResult | FailureResult)[];
