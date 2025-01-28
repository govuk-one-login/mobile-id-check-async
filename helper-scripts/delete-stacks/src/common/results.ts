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

export const buildStackFailureResultFromError = (
  stackName: string,
  error: unknown,
): FailureResult => {
  let reason = "Failed to delete " + stackName + ".";
  if (error instanceof Error) {
    reason = reason + " " + error.message;
  }
  return {
    stackName,
    status: "FAILURE",
    reason,
  };
};
